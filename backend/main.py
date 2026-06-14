import sys
import time
from datetime import datetime

# Reconfigure stdout/stderr to use UTF-8 encoding (helps with Windows console encoding issues)
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.database import SessionLocal, verify_db_connection
from backend.job_runner import init_runner_semaphores
from backend.models import ActiveJob
from backend.routes_history import router as history_router
from backend.routes_jobs import router as jobs_router
from backend.routes_session import router as session_router
from backend.routes_system import STATIC_DIR, router as system_router
from backend.storage import verify_r2_connectivity


app = FastAPI(title="Ideogram 4 WebUI Backend")

STATIC_DIR.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

app.include_router(history_router)
app.include_router(jobs_router)
app.include_router(session_router)
app.include_router(system_router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    print(f"[API Log] {request.method} {request.url.path} - Status: {response.status_code} - Duration: {duration:.3f}s", flush=True)
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print("\n[FastAPI] Validation Error occurred!")
    print("Method/Path:", request.method, request.url.path)
    print("Errors:", exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.on_event("startup")
def on_startup():
    print("[Startup] Running diagnostics checks...")
    verify_db_connection()
    try:
        verify_r2_connectivity()
    except Exception as e:
        print(f"[Startup] Ignoring R2 connectivity check failure for local testing: {e}")
    init_runner_semaphores()

    try:
        from alembic.config import Config
        from alembic import command

        alembic_ini_path = STATIC_DIR.parent / "alembic.ini"
        alembic_cfg = Config(str(alembic_ini_path))
        alembic_cfg.set_main_option("script_location", str(STATIC_DIR.parent / "backend" / "migrations"))

        print("[Startup] Running database migrations...")
        try:
            command.upgrade(alembic_cfg, "head")
        except Exception as ex:
            print(f"[Startup] Ignoring db migration error: {ex}")
        print("[Startup] Database migrations completed.")

        with SessionLocal() as db:
            interrupted = db.query(ActiveJob).filter(
                ActiveJob.status.in_(["pending", "upsampling", "upsampled", "generating"])
            ).all()
            for job in interrupted:
                job.status = "failed"
                job.progress_step = "interrupted"
                job.display_text = "Interrupted by server restart"
                job.error_message = "The server restarted before this job completed. Create a new job to retry."
                job.updated_at = datetime.utcnow()
            if interrupted:
                db.commit()
                print(f"[Startup] Marked {len(interrupted)} interrupted jobs as failed.")
    except Exception as exc:
        print(f"[Startup] Critical Error: Database migrations failed: {exc}")
        raise RuntimeError(f"Database migrations failed: {exc}") from exc
