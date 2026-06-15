import asyncio
import os
import json
import threading
from typing import Optional

import anyio


from backend.cancellation import JobCancelled, new_cancel_token
from backend.database import SessionLocal
from backend.job_state import build_steps, save_completed_history, update_job_record
from backend.models import ActiveJob, SystemSetting
from backend.providers import get_chat_providers, get_default_upsampler_id, get_generation_providers, get_upsampler_providers
from backend.storage import upload_previews_zip
from backend.utils import clean_and_reorder_prompt_json
from backend.ws import finish_websocket_stream, push_generation_progress, push_job, websocket_stream_callback, ws_manager


llm_semaphore: Optional[asyncio.Semaphore] = None
provider_semaphores: dict[str, asyncio.Semaphore] = {}
job_tasks: dict[str, asyncio.Task] = {}
cancel_tokens: dict[str, threading.Event] = {}
def get_hold_generation() -> bool:
    try:
        with SessionLocal() as db:
            setting = db.query(SystemSetting).filter(SystemSetting.key == "hold_generation").first()
            if setting:
                return setting.value == "true"
    except Exception as e:
        print(f"[Jobs] Error reading settings from DB: {e}", flush=True)
    return False

def set_hold_generation(val: bool):
    try:
        with SessionLocal() as db:
            setting = db.query(SystemSetting).filter(SystemSetting.key == "hold_generation").first()
            val_str = "true" if val else "false"
            if setting:
                setting.value = val_str
            else:
                setting = SystemSetting(key="hold_generation", value=val_str)
                db.add(setting)
            db.commit()
    except Exception as e:
        print(f"[Jobs] Error writing settings to DB: {e}", flush=True)
    print(f"[Jobs] hold_generation set to {val}", flush=True)
    if not val:
        resume_held_jobs()

def resume_held_jobs():
    with SessionLocal() as db:
        held_jobs = db.query(ActiveJob).filter(ActiveJob.status == "held").order_by(ActiveJob.updated_at.asc()).all()
        job_ids = [job.job_id for job in held_jobs]
    if job_ids:
        print(f"[Jobs] Resuming {len(job_ids)} held jobs", flush=True)
        for job_id in job_ids:
            schedule_job(job_id)


def init_runner_semaphores():
    global llm_semaphore, provider_semaphores
    upsamplers = get_upsampler_providers()
    llm_limit = max([p.config.get("max_simultaneous", 3) for p in upsamplers.values()] + [3])
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
        upsamplers = get_upsampler_providers()
        llm_limit = max([p.config.get("max_simultaneous", 3) for p in upsamplers.values()] + [3])
        llm_semaphore = asyncio.Semaphore(llm_limit)
    return llm_semaphore


def schedule_job(job_id: str):
    token = cancel_tokens.setdefault(job_id, new_cancel_token())
    token.clear()
    task = asyncio.create_task(execute_server_job(job_id, token))
    job_tasks[job_id] = task
    task.add_done_callback(lambda _task, finished_job_id=job_id: job_tasks.pop(finished_job_id, None))


def cancel_job_task(job_id: str):
    token = cancel_tokens.pop(job_id, None)
    if token is not None:
        token.set()
    task = job_tasks.pop(job_id, None)
    if task and not task.done():
        task.cancel()


def get_cancel_token(job_id: str) -> threading.Event:
    """Return (creating if needed) the per-job cancellation token.

    Used by request-scoped flows (e.g. editor chat) so that deleting the job
    can interrupt an in-flight provider stream.
    """
    return cancel_tokens.setdefault(job_id, new_cancel_token())


def describe_upsampler(upsampler, upsampler_params: dict) -> str:
    template = upsampler_params.get("template")
    label = upsampler.get_display_name() if upsampler else upsampler_params.get("provider") or "configured upsampler"
    # Templates only apply to chat-engine upsamplers (they select a prompt
    # template); HTTP upsamplers such as Ideogram Magic ignore the field, so
    # don't surface a meaningless "/ template" suffix for them.
    uses_template = upsampler is not None and "template" in (upsampler.config.get("inputs") or {})
    return f"{label} / {template}" if (template and uses_template) else label


async def execute_server_job(job_id: str, cancel_token: Optional[threading.Event] = None):
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

        if advanced_mode and final_prompt:
            with SessionLocal() as db:
                db_job = db.query(ActiveJob).filter(ActiveJob.job_id == job_id).first()
                chat_messages = db_job.chat_messages if db_job else []
            if not chat_messages:
                chat_messages = [
                    {"role": "system", "content": "Visual Prompt Layout Chat Assistant."},
                    {"role": "assistant", "content": final_prompt}
                ]
            state = update_job_record(
                job_id,
                raw_prompt=raw_prompt,
                upsampled_prompt=final_prompt,
                upsampler_params=upsampler_params,
                chat_messages=chat_messages,
                status="editing",
                progress_step="editing",
                display_text="Layout draft ready",
                steps=build_steps(magic_prompt or is_json_mode, True, "editing"),
            )
            await push_job("job_update", state)
            return

        if not final_prompt and (magic_prompt or is_json_mode):
            upsampler = get_upsampler_providers().get(upsampler_id or get_default_upsampler_id())
            if not upsampler:
                raise ValueError(f"Unknown upsampler: {upsampler_id}")
            upsampler_label = describe_upsampler(upsampler, upsampler_params)
            state = update_job_record(
                job_id,
                status="upsampling",
                progress_step="upsampling",
                display_text=f"Upsampling with {upsampler_label}",
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
                # describe_json is a chat-LLM capability (JSON -> human
                # description). HTTP upsamplers such as Ideogram Magic can only
                # do text -> JSON, so route the description to a chat-capable
                # provider when the selected upsampler can't handle it.
                describer = upsampler if hasattr(upsampler.engine, "describe_json") else next(iter(get_chat_providers().values()), None)
                async with get_llm_semaphore():
                    if describer is not None and hasattr(describer.engine, "describe_json"):
                        raw_prompt = await anyio.to_thread.run_sync(
                            lambda: describer.describe_json(final_prompt, cancel_token=cancel_token)
                        )
                    else:
                        raw_prompt = final_prompt
                messages = []
            else:
                aspect_ratio = provider_params.get("aspect_ratio", "1:1")
                async with get_llm_semaphore():
                    stream_emit = websocket_stream_callback(job_id, "progress")
                    result = await anyio.to_thread.run_sync(
                        lambda: upsampler.upsample_prompt(
                            raw_prompt, aspect_ratio, upsampler_params, stream_emit, cancel_token=cancel_token
                        )
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

        if get_hold_generation():
            print(f"[Jobs] Job {job_id} is held (hold_generation is True).", flush=True)
            state = update_job_record(
                job_id,
                raw_prompt=raw_prompt,
                upsampled_prompt=final_prompt,
                upsampler_params=upsampler_params,
                status="held",
                progress_step="held",
                display_text="Held in queue",
                steps=build_steps(magic_prompt or is_json_mode, advanced_mode, "queued"),
            )
            await push_job("job_update", state)
            return

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
        collected_previews = {}

        def on_generation_progress(event_type, data):
            if event_type == "step":
                step = data.get("current", 0)
                total = data.get("total", 0)
                display = f"Step {step}/{total}"
                update_job_record(job_id, display_text=display, progress_step="generating")
                previews = data.get("previews")
                if previews and isinstance(previews, dict):
                    for k, step_b64s in previews.items():
                        try:
                            step_key = int(k)
                            if isinstance(step_b64s, list):
                                collected_previews[step_key] = step_b64s
                        except ValueError:
                            pass
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
                    lambda: provider.execute_stream(
                        final_prompt or raw_prompt, provider_params, on_generation_progress, cancel_token=cancel_token
                    )
                )
            else:
                images = await anyio.to_thread.run_sync(
                    lambda: provider.execute(final_prompt or raw_prompt, provider_params, cancel_token=cancel_token)
                )

        previews_url = None
        print(f"[Jobs] Collected {len(collected_previews)} preview steps for zip upload", flush=True)
        if collected_previews:
            ordered_previews = []
            for step_key in sorted(collected_previews.keys()):
                ordered_previews.extend(collected_previews[step_key])

            import time
            import random
            ts = int(time.time() * 1000)
            rand_id = random.randint(100000, 999999)
            zip_name = f"previews/{ts}_{rand_id}_previews.zip"
            try:
                previews_url = await anyio.to_thread.run_sync(
                    upload_previews_zip, ordered_previews, zip_name,
                )
                print(f"[Jobs] Uploaded previews zip: {previews_url}", flush=True)
            except Exception as exc:
                print(f"[Jobs] Failed to upload previews zip: {exc}", flush=True)

        await save_completed_history(job_id, images, previews_url=previews_url)

        print(f"[Jobs] About to update job with previews_url={previews_url}", flush=True)
        state = update_job_record(
            job_id,
            images=images,
            previews_url=previews_url,
            status="completed",
            progress_step="completed",
            display_text="Completed",
            steps=[{**step, "status": "completed"} for step in build_steps(magic_prompt or is_json_mode, advanced_mode)],
        )
        print(f"[Jobs] update_job_record returned previewsUrl={state.get('previewsUrl')}", flush=True)
        await push_job("job_completed", state)
    except JobCancelled:
        print(f"[Jobs] Job {job_id} cancelled via token.", flush=True)
    except asyncio.CancelledError:
        print(f"[Jobs] Job {job_id} cancelled.", flush=True)
        raise
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
