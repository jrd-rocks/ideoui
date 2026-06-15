from datetime import datetime
from typing import Optional

from fastapi import APIRouter

from backend.database import SessionLocal
from backend.models import SessionState
from backend.schemas import SessionStatePayload


router = APIRouter(prefix="/api/session", tags=["session"])

# Sentinel tab_uuid for the global "latest write anywhere" row. Every save writes
# both the per-tab row (same-browser multi-tab isolation) and this global row so a
# device returning later picks up the most recent write from any device/tab.
GLOBAL_TAB_UUID = "__global__"


def _serialize(state: SessionState) -> dict:
    return {
        "tab_uuid": state.tab_uuid,
        "active_job_id": state.active_job_id,
        "route": state.route,
        "form_state": state.form_state,
        "draft_json": state.draft_json,
        "lastUpdated": state.last_updated.isoformat(),
    }


def _upsert(db, tab_uuid: str, payload: SessionStatePayload, now: datetime) -> SessionState:
    state = db.query(SessionState).filter(SessionState.tab_uuid == tab_uuid).first()
    if not state:
        state = SessionState(tab_uuid=tab_uuid)
        db.add(state)
    state.active_job_id = payload.active_job_id
    state.route = payload.route
    state.form_state = payload.form_state or {}
    state.draft_json = payload.draft_json
    state.last_updated = now
    return state


@router.post("/state")
def save_session_state(payload: SessionStatePayload):
    now = datetime.utcnow()
    with SessionLocal() as db:
        per_tab = _upsert(db, payload.tab_uuid, payload, now)
        # Mirror to the global row so the latest write from any device wins on read.
        _upsert(db, GLOBAL_TAB_UUID, payload, now)
        db.commit()
        db.refresh(per_tab)
        return _serialize(per_tab)


@router.get("/state")
def read_session_state(tab_uuid: Optional[str] = None):
    with SessionLocal() as db:
        if tab_uuid:
            per_tab = db.query(SessionState).filter(SessionState.tab_uuid == tab_uuid).first()
        else:
            # No tab context: return the newest row overall (original behaviour).
            state = db.query(SessionState).order_by(SessionState.last_updated.desc()).first()
            return _serialize(state) if state else None
        global_row = db.query(SessionState).filter(SessionState.tab_uuid == GLOBAL_TAB_UUID).first()

        candidates = [s for s in (per_tab, global_row) if s]
        if not candidates:
            return None
        # Latest write wins: prefer the row with the greater last_updated.
        # Stable sort keeps the per-tab row ahead of the global row on a tie.
        candidates.sort(key=lambda s: s.last_updated, reverse=True)
        return _serialize(candidates[0])
