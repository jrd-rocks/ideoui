from datetime import datetime
from typing import Optional

from fastapi import APIRouter

from backend.database import SessionLocal
from backend.models import SessionState
from backend.schemas import SessionStatePayload


router = APIRouter(prefix="/api/session", tags=["session"])


@router.post("/state")
def save_session_state(payload: SessionStatePayload):
    with SessionLocal() as db:
        state = db.query(SessionState).filter(SessionState.tab_uuid == payload.tab_uuid).first()
        if not state:
            state = SessionState(tab_uuid=payload.tab_uuid)
            db.add(state)
        state.active_job_id = payload.active_job_id
        state.route = payload.route
        state.form_state = payload.form_state or {}
        state.draft_json = payload.draft_json
        state.last_updated = datetime.utcnow()
        db.commit()
        db.refresh(state)
        return {
            "tab_uuid": state.tab_uuid,
            "active_job_id": state.active_job_id,
            "route": state.route,
            "form_state": state.form_state,
            "draft_json": state.draft_json,
            "lastUpdated": state.last_updated.isoformat(),
        }


@router.get("/state")
def read_session_state(tab_uuid: Optional[str] = None):
    with SessionLocal() as db:
        query = db.query(SessionState)
        if tab_uuid:
            state = query.filter(SessionState.tab_uuid == tab_uuid).first()
        else:
            state = query.order_by(SessionState.last_updated.desc()).first()
        if not state:
            return None
        return {
            "tab_uuid": state.tab_uuid,
            "active_job_id": state.active_job_id,
            "route": state.route,
            "form_state": state.form_state,
            "draft_json": state.draft_json,
            "lastUpdated": state.last_updated.isoformat(),
        }
