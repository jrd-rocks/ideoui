import os
import sys
import uvicorn

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)

    os.environ["PYTHONUNBUFFERED"] = "1"

    ui_dir = os.path.dirname(os.path.abspath(__file__))
    reload_dirs = [os.path.join(ui_dir, "backend")]

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=reload_dirs)