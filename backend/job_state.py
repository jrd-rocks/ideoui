import time
from datetime import datetime

from backend.database import SessionLocal
from backend.models import ActiveJob, GenerationHistory


def job_params_for_client(job: ActiveJob) -> dict:
    provider_params = dict(job.provider_params or {})
    upsampler_params = dict(job.upsampler_params or {})
    aspect_ratio = provider_params.get("aspect_ratio", "1:1")
    sizes = {
        "1:1": "1024x1024",
        "16:9": "1344x768",
        "9:16": "768x1344",
        "5:4": "1152x896",
        "4:5": "896x1152",
        "3:2": "1216x832",
        "2:3": "832x1216",
    }
    return {
        **provider_params,
        "endpoint": job.provider,
        "endpointType": "modal",
        "preset": provider_params.get("sampler_preset", provider_params.get("preset", "V4_QUALITY_48")),
        "size": provider_params.get("size", sizes.get(aspect_ratio, "1024x1024")),
        "steps": provider_params.get("steps", 48),
        "guidance": provider_params.get("guidance", ""),
        "imageCount": provider_params.get("image_count", provider_params.get("imageCount", 4)),
        "seed": provider_params.get("seed", 0),
        "magicPrompt": upsampler_params.get("_magic_prompt", False),
        "advancedMode": upsampler_params.get("_advanced_mode", False),
        "isJsonMode": upsampler_params.get("_is_json_mode", False),
        "upsampleTemplate": upsampler_params.get("template", "v1"),
        "sourceRawPrompt": upsampler_params.get("_source_raw_prompt"),
    }


def public_upsampler_params(job: ActiveJob) -> dict:
    return {key: value for key, value in (job.upsampler_params or {}).items() if not key.startswith("_")}


def job_to_dict(job: ActiveJob) -> dict:
    return {
        "id": job.job_id,
        "job_id": job.job_id,
        "uuid": job.uuid,
        "parentUuid": job.parent_uuid,
        "rawPrompt": job.raw_prompt,
        "upsampledPrompt": job.upsampled_prompt,
        "params": job_params_for_client(job),
        "provider": job.provider,
        "upsampler": job.upsampler,
        "providerParams": job.provider_params or {},
        "upsamplerParams": public_upsampler_params(job),
        "status": job.status,
        "detailedStep": job.progress_step,
        "displayText": job.display_text,
        "display_text": job.display_text,
        "steps": job.steps or [],
        "chatMessages": job.chat_messages or [],
        "draftJson": job.draft_json,
        "images": job.images,
        "previewsUrl": job.previews_url,
        "error": job.error_message,
    }


def update_job_record(job_id: str, **updates) -> dict:
    with SessionLocal() as db:
        job = db.query(ActiveJob).filter(ActiveJob.job_id == job_id).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")
        for key, value in updates.items():
            setattr(job, key, value)
        job.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(job)
        return job_to_dict(job)


def build_steps(magic_prompt: bool, advanced_mode: bool, active: str = "queued") -> list:
    names = []
    if magic_prompt:
        names.append(("upsampling", "Upsampling prompt"))
    if advanced_mode:
        names.append(("editing", "Layout editor"))
    names.append(("generating", "Rendering images"))
    steps = []
    active_seen = False
    for index, (key, name) in enumerate(names):
        if key == active or (active == "queued" and index == 0):
            status = "active"
            active_seen = True
        elif active_seen:
            status = "pending"
        else:
            status = "completed"
        steps.append({"id": key, "name": name, "status": status})
    return steps


def save_completed_history(job_id: str, images: list[str]):
    with SessionLocal() as db:
        job = db.query(ActiveJob).filter(ActiveJob.job_id == job_id).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")
        history = db.query(GenerationHistory).filter(GenerationHistory.uuid == job.uuid).first()
        if history:
            print(
                f"[History Save] History already existed for job_id={job.job_id} uuid={job.uuid}; keeping existing images={len(history.images or [])}",
                flush=True,
            )
            return

        history = GenerationHistory(
            timestamp=int(time.time() * 1000),
            uuid=job.uuid,
            parent_uuid=job.parent_uuid,
            raw_prompt=job.raw_prompt,
            upsampled_prompt=job.upsampled_prompt,
            images=images,
            previews_url=job.previews_url,
            params={
                "provider": job.provider,
                "upsampler": job.upsampler,
                "providerParams": job.provider_params or {},
                "upsamplerParams": public_upsampler_params(job),
                **job_params_for_client(job),
            },
        )
        db.add(history)
        db.commit()
        print(
            f"[History Save] Saved completed job job_id={job.job_id} uuid={job.uuid} parent_uuid={job.parent_uuid} images={len(images)}",
            flush=True,
        )
