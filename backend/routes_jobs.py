import json
import time
import uuid
from datetime import datetime, timedelta

import anyio
from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from sqlalchemy import or_

from backend.database import SessionLocal
from backend.job_runner import cancel_job_task, get_hold_generation, get_llm_semaphore, schedule_job
from backend.job_state import build_steps, job_to_dict, update_job_record
from backend.json_helpers import strict_json_prompt
from backend.models import ActiveJob
from backend.providers import get_generation_providers, get_upsampler_providers, get_chat_providers
from backend.schemas import JobCreate
from backend.ws import finish_websocket_stream, push_job, websocket_stream_callback, ws_manager


router = APIRouter(tags=["jobs"])


def editor_chat_messages(current_json: str, user_message: str) -> list[dict]:
    return [
        {
            "role": "system",
            "content": (
                "You are editing an Ideogram structured JSON prompt. "
                "Return ONLY one valid JSON object. Do not use markdown, headings, bullets, commentary, or code fences. "
                "Preserve this schema: aspect_ratio, high_level_description, optional style_description, "
                "and compositional_deconstruction with background and elements. "
                "Each element must keep type, bbox, and desc/text fields as appropriate."
            ),
        },
        {"role": "assistant", "content": current_json or "{}"},
        {"role": "user", "content": user_message or "Refine the current layout while preserving valid JSON."},
    ]


@router.post("/api/jobs", status_code=202)
async def create_job(payload: JobCreate):
    generation_providers = get_generation_providers()
    if payload.provider not in generation_providers:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {payload.provider}")
    if payload.upsampler and payload.upsampler not in get_upsampler_providers():
        raise HTTPException(status_code=400, detail=f"Unknown upsampler: {payload.upsampler}")

    job_id = f"job_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
    job_uuid = str(uuid.uuid4())
    # When advanced_mode + cached upsampled_prompt are both present, create
    # as "editing" directly to avoid a race condition where the async task's
    # quick WebSocket update gets overwritten by the HTTP response.
    if payload.job_type == "editing":
        status = "editing"
    elif payload.advanced_mode and payload.upsampled_prompt:
        status = "editing"
    elif get_hold_generation():
        # Hold active: immediately park as held so it never starts
        status = "held"
    else:
        status = "pending"
    upsampler_params = dict(payload.upsampler_params or {})
    upsampler_params.update({
        "_magic_prompt": payload.magic_prompt,
        "_advanced_mode": payload.advanced_mode,
        "_is_json_mode": payload.is_json_mode,
    })
    steps = build_steps(payload.magic_prompt or payload.is_json_mode, payload.advanced_mode, "editing" if status == "editing" else "queued")
    chat_messages = payload.chat_messages or []
    if status == "editing" and payload.upsampled_prompt and not chat_messages:
        chat_messages = [
            {"role": "system", "content": "Visual Prompt Layout Chat Assistant."},
            {"role": "assistant", "content": payload.upsampled_prompt},
        ]
    with SessionLocal() as db:
        job = ActiveJob(
            job_id=job_id,
            uuid=job_uuid,
            parent_uuid=payload.parent_uuid,
            status=status,
            provider=payload.provider,
            upsampler=payload.upsampler,
            job_type=payload.job_type,
            progress_step=status,
            display_text="Layout draft ready" if status == "editing" else ("Held in queue" if status == "held" else "Queued"),
            raw_prompt=payload.raw_prompt,
            upsampled_prompt=payload.upsampled_prompt,
            provider_params=payload.provider_params or {},
            upsampler_params=upsampler_params,
            draft_json=payload.draft_json,
            chat_messages=chat_messages,
            steps=steps,
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        response_job = job_to_dict(job)

    await push_job("job_created", response_job)
    if status == "pending":
        schedule_job(job_id)
    return {"job_id": job_id, "uuid": job_uuid, "job": response_job, "held": status == "held"}


@router.get("/api/jobs/active")
def read_active_jobs():
    cutoff = datetime.utcnow() - timedelta(minutes=10)
    with SessionLocal() as db:
        jobs = db.query(ActiveJob).filter(
            or_(ActiveJob.status.notin_(["completed", "failed"]), ActiveJob.updated_at >= cutoff)
        ).order_by(ActiveJob.updated_at.desc()).all()
        return [job_to_dict(job) for job in jobs]


@router.get("/api/jobs/{job_id}")
def read_job(job_id: str):
    with SessionLocal() as db:
        job = db.query(ActiveJob).filter(ActiveJob.job_id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job_to_dict(job)


@router.delete("/api/jobs/completed")
async def delete_completed_jobs():
    with SessionLocal() as db:
        jobs = db.query(ActiveJob).filter(ActiveJob.status.in_(["completed", "failed", "cancelled"])).all()
        removed_ids = [job.job_id for job in jobs]
        for job in jobs:
            db.delete(job)
        db.commit()
    for job_id in removed_ids:
        await ws_manager.broadcast({"event_type": "job_removed", "job_id": job_id, "id": job_id})
    return {"removed": removed_ids}


@router.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    cancel_job_task(job_id)
    with SessionLocal() as db:
        job = db.query(ActiveJob).filter(ActiveJob.job_id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        db.delete(job)
        db.commit()
    await ws_manager.broadcast({"event_type": "job_removed", "job_id": job_id, "id": job_id})
    return {"removed": job_id}


@router.patch("/api/jobs/{job_id}")
async def patch_job(job_id: str, request: Request):
    data = await request.json()
    allowed = {
        "upsampled_prompt": "upsampled_prompt",
        "upsampledPrompt": "upsampled_prompt",
        "provider_params": "provider_params",
        "providerParams": "provider_params",
        "draft_json": "draft_json",
        "draftJson": "draft_json",
        "chat_messages": "chat_messages",
        "chatMessages": "chat_messages",
        "status": "status",
    }
    updates = {target: data[source] for source, target in allowed.items() if source in data}
    if not updates:
        raise HTTPException(status_code=400, detail="No supported job fields supplied")
    try:
        job = update_job_record(job_id, **updates)
    except ValueError:
        raise HTTPException(status_code=404, detail="Job not found")
    await push_job("job_update", job)
    return job


@router.post("/api/jobs/{job_id}/chat")
async def chat_job(job_id: str, request: Request):
    body = await request.json()
    visible_messages = body.get("messages") or []
    user_message = body.get("message")
    with SessionLocal() as db:
        job = db.query(ActiveJob).filter(ActiveJob.job_id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        current_json = job.upsampled_prompt or "{}"
        if not visible_messages:
            visible_messages = list(job.chat_messages or [])
            if user_message:
                visible_messages.append({"role": "user", "content": user_message})
        job.chat_messages = visible_messages
        job.updated_at = datetime.utcnow()
        db.commit()

    model_messages = editor_chat_messages(current_json, user_message or "")
    chat_provider_id = body.get("chat_provider")
    chat_providers = get_chat_providers()
    if chat_provider_id and chat_provider_id in chat_providers:
        provider = chat_providers[chat_provider_id]
    elif chat_providers:
        provider = next(iter(chat_providers.values()))
    else:
        raise HTTPException(status_code=400, detail="No chat-capable providers configured")
        
    stream_emit = websocket_stream_callback(job_id, "chat")
    async with get_llm_semaphore():
        result = await anyio.to_thread.run_sync(provider.query, model_messages, stream_emit)
    assistant_text = result["choices"][0]["message"]["content"].strip()
    try:
        assistant_reply = strict_json_prompt(assistant_text)
    except ValueError as exc:
        await ws_manager.broadcast({
            "event_type": "llm_stream",
            "job_id": job_id,
            "context": "chat",
            "stream_type": "content",
            "token": "",
            "done": True,
        })
        raise HTTPException(status_code=502, detail=str(exc))
    await finish_websocket_stream(job_id, "chat", stream_emit)

    final_messages = [*visible_messages, {"role": "assistant", "content": assistant_reply}]
    try:
        state = update_job_record(
            job_id,
            upsampled_prompt=assistant_reply,
            chat_messages=final_messages,
            draft_json=json.loads(assistant_reply),
        )
    except Exception:
        state = update_job_record(
            job_id,
            upsampled_prompt=assistant_reply,
            chat_messages=final_messages,
        )
    await push_job("job_update", state)
    return {"job_id": job_id, "upsampledPrompt": assistant_reply, "job": state}


@router.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        await websocket.send_json({"event_type": "initial_sync", "jobs": read_active_jobs()})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
