from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse

import backend.prompts as prompts
from backend.providers import get_provider_schemas, get_chat_providers
from backend.json_helpers import extract_json_from_text
from backend.utils import clean_and_reorder_prompt_json


CURR_DIR = Path(__file__).parent.parent.resolve()
STATIC_DIR = CURR_DIR / "static"

router = APIRouter(tags=["system"])

@router.get("/api/system/settings")
def get_system_settings():
    from backend.job_runner import get_hold_generation
    return {"hold_generation": get_hold_generation()}

@router.post("/api/system/settings")
async def update_system_settings(request: Request):
    data = await request.json()
    if "hold_generation" in data:
        from backend.job_runner import set_hold_generation
        set_hold_generation(bool(data["hold_generation"]))
    return {"status": "updated"}

@router.get("/api/providers/chat")
def get_chat_providers_route():
    providers = get_chat_providers()
    return [{"id": pid, "name": p.get_display_name()} for pid, p in providers.items()]


@router.get("/api/providers/schemas")
def provider_schemas():
    return get_provider_schemas()


@router.post("/api/log_error")
async def log_frontend_error(request: Request):
    try:
        data = await request.json()
        print("\n[Frontend JSON Parse Failure]")
        if data.get("url"):
            print(f"  URL: {data.get('url')}")
        if data.get("status"):
            print(f"  Status: {data.get('status')}")
        if data.get("context"):
            print(f"  Context: {data.get('context')}")
        print(f"  Error: {data.get('error')}")
        print("  Raw Data:")
        print("------------- RAW DATA START -------------")
        raw_text = data.get("text")
        print(raw_text)
        print("-------------- RAW DATA END --------------\n", flush=True)

        # Reactive database JSON repair
        context = data.get("context")
        if context == "JSON.parse" and raw_text:
            from backend.database import SessionLocal
            from backend.models import GenerationHistory, ActiveJob
            from json_repair import repair_json
            import json

            is_invalid = False
            try:
                json.loads(raw_text)
            except Exception:
                is_invalid = True

            if is_invalid:
                try:
                    repaired = repair_json(raw_text)
                    json.loads(repaired)  # Verify repaired version is valid JSON

                    with SessionLocal() as db:
                        # Exact search first
                        history_item = db.query(GenerationHistory).filter(GenerationHistory.upsampled_prompt == raw_text).first()
                        if not history_item and raw_text:
                            stripped = raw_text.strip()
                            history_item = db.query(GenerationHistory).filter(GenerationHistory.upsampled_prompt == stripped).first()

                        if history_item:
                            history_item.upsampled_prompt = repaired
                            db.commit()
                            print(f"[JSON Repair] Auto-repaired and updated GenerationHistory record (UUID: {history_item.uuid}) in DB.", flush=True)
                        else:
                            active_job = db.query(ActiveJob).filter(ActiveJob.upsampled_prompt == raw_text).first()
                            if not active_job and raw_text:
                                stripped = raw_text.strip()
                                active_job = db.query(ActiveJob).filter(ActiveJob.upsampled_prompt == stripped).first()
                            if active_job:
                                active_job.upsampled_prompt = repaired
                                db.commit()
                                print(f"[JSON Repair] Auto-repaired and updated ActiveJob record (UUID: {active_job.uuid}) in DB.", flush=True)
                except Exception as repair_exc:
                    print(f"[JSON Repair Failed to Auto-Fix DB]: {repair_exc}", flush=True)

    except Exception as exc:
        print(f"[Error Logging Endpoint Failed]: {exc}", flush=True)
    return {"status": "logged"}


@router.post("/api/repair_json")
async def repair_json_route(request: Request):
    try:
        data = await request.json()
        raw_text = data.get("text", "")
        extracted = extract_json_from_text(raw_text)
        repaired = clean_and_reorder_prompt_json(extracted)
        return {"repaired": repaired}
    except Exception as exc:
        print(f"[JSON Repair Failed]: {exc}", flush=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/")
def get_index():
    index_html = STATIC_DIR / "index.html"
    if index_html.exists():
        return FileResponse(index_html)
    return HTMLResponse("<h1>Ideogram 4 WebUI</h1><p>Please ensure index.html exists in static directory.</p>")


@router.get("/api/upsample_templates")
def get_upsample_templates():
    return prompts.list_templates()


@router.get("/api/system_prompt")
def get_system_prompt(name: str = "v1"):
    try:
        return prompts.load_template_prompts(name)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read system prompt: {exc}")