from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse

import backend.prompts as prompts
from backend.config import get_inference_endpoints
from backend.json_helpers import extract_json_from_text
from backend.providers import get_provider_schemas
from backend.utils import clean_and_reorder_prompt_json


CURR_DIR = Path(__file__).parent.parent.resolve()
STATIC_DIR = CURR_DIR / "static"

router = APIRouter(tags=["system"])


@router.get("/api/endpoints")
def get_endpoints():
    endpoints = get_inference_endpoints()
    return [{"name": ep.get("name"), "type": ep.get("type"), "default": ep.get("default", False)} for ep in endpoints]


@router.get("/api/providers/schemas")
def provider_schemas():
    return get_provider_schemas()


@router.post("/api/log_error")
async def log_frontend_error(request: Request):
    try:
        data = await request.json()
        print(f"\n[Frontend JSON Parse Failure]")
        if data.get("url"):
            print(f"  URL: {data.get('url')}")
        if data.get("status"):
            print(f"  Status: {data.get('status')}")
        if data.get("context"):
            print(f"  Context: {data.get('context')}")
        print(f"  Error: {data.get('error')}")
        print("  Raw Data:")
        print("------------- RAW DATA START -------------")
        print(data.get("text"))
        print("-------------- RAW DATA END --------------\n", flush=True)
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