import asyncio
from typing import Optional

import anyio

from backend.config import get_deepseek_config
from backend.database import SessionLocal
from backend.job_state import build_steps, save_completed_history, update_job_record
from backend.models import ActiveJob
from backend.providers import get_generation_providers, get_upsampler_providers
from backend.storage import upload_previews_zip
from backend.utils import clean_and_reorder_prompt_json
from backend.ws import finish_websocket_stream, push_generation_progress, push_job, websocket_stream_callback, ws_manager


llm_semaphore: Optional[asyncio.Semaphore] = None
provider_semaphores: dict[str, asyncio.Semaphore] = {}
job_tasks: dict[str, asyncio.Task] = {}


def init_runner_semaphores():
    global llm_semaphore, provider_semaphores
    ds_cfg = get_deepseek_config()
    llm_limit = ds_cfg.get("max_simultaneous", 3)
    llm_semaphore = asyncio.Semaphore(llm_limit)

    provider_semaphores = {}
    generation_providers = get_generation_providers()
    for name, provider in generation_providers.items():
        provider_semaphores[name] = asyncio.Semaphore(provider.config.get("max_simultaneous", 2))
    print(
        f"[Startup] Concurrency semaphores initialized: LLM limit = {llm_limit}, providers count = {len(generation_providers)}",
        flush=True,
    )


def get_llm_semaphore() -> asyncio.Semaphore:
    global llm_semaphore
    if llm_semaphore is None:
        ds_cfg = get_deepseek_config()
        llm_semaphore = asyncio.Semaphore(ds_cfg.get("max_simultaneous", 3))
    return llm_semaphore


def schedule_job(job_id: str):
    task = asyncio.create_task(execute_server_job(job_id))
    job_tasks[job_id] = task
    task.add_done_callback(lambda _task, finished_job_id=job_id: job_tasks.pop(finished_job_id, None))


def cancel_job_task(job_id: str):
    task = job_tasks.pop(job_id, None)
    if task and not task.done():
        task.cancel()
    # Also cancel any active streaming response on the provider
    from backend.providers import get_generation_providers
    for provider in get_generation_providers().values():
        if hasattr(provider, 'cancel'):
            provider.cancel()


def describe_upsampler(upsampler, upsampler_params: dict) -> str:
    template = upsampler_params.get("template")
    label = upsampler.get_display_name() if upsampler else upsampler_params.get("provider") or "configured upsampler"
    return f"{label} / {template}" if template else label


async def execute_server_job(job_id: str):
    try:
        with SessionLocal() as db:
            job = db.query(ActiveJob).filter(ActiveJob.job_id == job_id).first()
            if not job:
                return
            raw_prompt = job.raw_prompt
            final_prompt = job.upsampled_prompt
            provider_id = job.provider
            upsampler_id = job.upsampler
            provider_params = dict(job.provider_params or {})
            upsampler_params = dict(job.upsampler_params or {})
            magic_prompt = bool(upsampler_params.get("_magic_prompt"))
            advanced_mode = bool(upsampler_params.get("_advanced_mode"))
            is_json_mode = bool(upsampler_params.get("_is_json_mode"))

        if not final_prompt and (magic_prompt or is_json_mode):
            upsampler = get_upsampler_providers().get(upsampler_id or "deepseek")
            if not upsampler:
                raise ValueError(f"Unknown upsampler: {upsampler_id}")
            upsampler_label = describe_upsampler(upsampler, upsampler_params)
            state = update_job_record(
                job_id,
                status="upsampling",
                progress_step="upsampling",
                display_text=f"Upsampling with {upsampler_label}: {raw_prompt}",
                steps=build_steps(True, advanced_mode, "upsampling"),
            )
            await push_job("job_update", state)
            await ws_manager.broadcast({
                "event_type": "llm_stream",
                "job_id": job_id,
                "context": "progress",
                "stream_type": "thinking",
                "token": "",
                "done": False,
            })
            if is_json_mode:
                upsampler_params["_source_raw_prompt"] = raw_prompt
                final_prompt = clean_and_reorder_prompt_json(raw_prompt)
                async with get_llm_semaphore():
                    raw_prompt = await anyio.to_thread.run_sync(upsampler.describe_json, final_prompt)
                messages = []
            else:
                aspect_ratio = provider_params.get("aspect_ratio", "1:1")
                async with get_llm_semaphore():
                    stream_emit = websocket_stream_callback(job_id, "progress")
                    result = await anyio.to_thread.run_sync(
                        upsampler.upsample_prompt,
                        raw_prompt,
                        aspect_ratio,
                        upsampler_params,
                        stream_emit,
                    )
                final_prompt = result["content"]
                messages = result["messages"] + [{"role": "assistant", "content": final_prompt}]
                await finish_websocket_stream(job_id, "progress", stream_emit)

            if advanced_mode:
                state = update_job_record(
                    job_id,
                    raw_prompt=raw_prompt,
                    upsampled_prompt=final_prompt,
                    upsampler_params=upsampler_params,
                    chat_messages=messages,
                    status="editing",
                    progress_step="editing",
                    display_text="Layout draft ready",
                    steps=build_steps(True, True, "editing"),
                )
                await push_job("job_update", state)
                return

        generation_providers = get_generation_providers()
        provider = generation_providers.get(provider_id)
        if not provider:
            raise ValueError(f"Unknown generation provider: {provider_id}")
        state = update_job_record(
            job_id,
            raw_prompt=raw_prompt,
            upsampled_prompt=final_prompt,
            upsampler_params=upsampler_params,
            status="generating",
            progress_step="generating",
            display_text=f"Rendering on {provider.get_display_name()}...",
            steps=build_steps(magic_prompt or is_json_mode, advanced_mode, "generating"),
        )
        await push_job("job_update", state)
        semaphore = provider_semaphores.setdefault(provider_id, asyncio.Semaphore(provider.config.get("max_simultaneous", 2)))
        collected_previews = []

        def on_generation_progress(event_type, data):
            if event_type == "step":
                step = data.get("current", 0)
                total = data.get("total", 0)
                display = f"Step {step}/{total}"
                update_job_record(job_id, display_text=display, progress_step="generating")
                previews = data.get("previews")
                if previews:
                    collected_previews.extend(
                        p for p in previews.values() if isinstance(p, list)
                        for item in p
                    )
                push_generation_progress(job_id, "step", {
                    "step": step, "total": total,
                    "previews": previews,
                })
            elif event_type == "status":
                push_generation_progress(job_id, "status", {
                    "text": data.get("text", ""),
                })

        async with semaphore:
            if hasattr(provider, "execute_stream"):
                images = await anyio.to_thread.run_sync(
                    provider.execute_stream, final_prompt or raw_prompt,
                    provider_params, on_generation_progress,
                )
            else:
                images = await anyio.to_thread.run_sync(provider.execute, final_prompt or raw_prompt, provider_params)

        save_completed_history(job_id, images)
        previews_url = None
        if collected_previews:
            import time, random
            ts = int(time.time() * 1000)
            rand_id = random.randint(100000, 999999)
            zip_name = f"previews/{ts}_{rand_id}_previews.zip"
            try:
                previews_url = await anyio.to_thread.run_sync(
                    upload_previews_zip, collected_previews, zip_name,
                )
                print(f"[Jobs] Uploaded previews zip: {previews_url}", flush=True)
            except Exception as exc:
                print(f"[Jobs] Failed to upload previews zip: {exc}", flush=True)
        state = update_job_record(
            job_id,
            images=images,
            previews_url=previews_url,
            status="completed",
            progress_step="completed",
            display_text="Completed",
            steps=[{**step, "status": "completed"} for step in build_steps(magic_prompt or is_json_mode, advanced_mode)],
        )
        await push_job("job_completed", state)
    except Exception as exc:
        print(f"[Jobs] Job {job_id} failed: {exc}", flush=True)
        try:
            state = update_job_record(
                job_id,
                status="failed",
                progress_step="failed",
                display_text="Execution failed",
                error_message=str(exc),
            )
            await push_job("job_failed", state)
        except Exception:
            pass
