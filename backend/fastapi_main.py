# backend/fastapi_main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO
import asyncio
from backend.transcription import which_file, TranscriptionError
import os
import tempfile
import uuid
from pathlib import Path
from backend.api.v1.health import router as health_db
from backend.db.session import engine
from backend.db.base import Base
from backend.api.v1.auth_anonymous import router as auth_anonymous_router

MB = 1024 * 1024
MAX_SIZE_IN_MEMORY = 5 * MB

TASKS_DIR = Path("/root/filety/backend/tasks")
TASKS_DIR.mkdir(parents=True, exist_ok=True)
TASKS: dict[str, dict] = {}

ALLOWED_ORIGINS = [
    "https://filety-core.vercel.app",
    "https://filety.vercel.app",
    "https://filety.ru",
    "https://filety.online",
]


app = FastAPI(title="Failety API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,
)

@app.get("/health")
async def health_check():
    return {"status": "ok"}


def _safe_remove(path: str | None):
    if not path:
        return
    try:
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        pass


@app.post("/translate")
async def translate_file(file: UploadFile = File(...)):
    media = file.content_type or ""

    temp_path = None
    total_size = 0
    buffer = None

    first_chunk = await file.read(1 * MB)
    total_size += len(first_chunk)

    if total_size <= MAX_SIZE_IN_MEMORY:
        content = first_chunk + await file.read()
        buffer = BytesIO(content)
        buffer.seek(0)
        source = buffer
    else:
        suffix = os.path.splitext(file.filename or "")[1] or ".tmp"
        fd, temp_path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)

        with open(temp_path, "wb") as f:
            f.write(first_chunk)

            while True:
                chunk = await file.read(2 * MB)
                if not chunk:
                    break
                total_size += len(chunk)
                f.write(chunk)

        source = temp_path

    cleanup_files = []

    try:
        text, clean = await asyncio.to_thread(which_file, source, media_type=media)
        cleanup_files.extend(clean)
        return {"transcription": text}

    except TranscriptionError as exc:
        cleanup_files.extend(exc.cleanup)
        return {
            "error": "Transcription failed",
            "details": str(exc),
        }

    except Exception as e:
        return {
            "error": "Transcription failed",
            "details": f"Unhandled: {e.__class__.__name__}: {e}",
        }

    finally:
        _safe_remove(temp_path)
        for f in cleanup_files:
            _safe_remove(f)


async def _save_upload_to_temp(file: UploadFile, task_id: str) -> str:
    suffix = os.path.splitext(file.filename or "")[1] or ".tmp"
    temp_path = TASKS_DIR / f"{task_id}{suffix}"
    with open(temp_path, "wb") as f:
        while True:
            chunk = await file.read(2 * MB)
            if not chunk:
                break
            f.write(chunk)
    return str(temp_path)


async def _process_task(task_id: str):
    task_info = TASKS.get(task_id)
    if not task_info:
        return
    input_path = task_info["input_path"]
    media = task_info["media"]
    try:
        text, cleanup = await asyncio.to_thread(which_file, input_path, media_type=media)
        TASKS[task_id]["cleanup"].extend(cleanup)
        TASKS[task_id]["result"] = text
        TASKS[task_id]["status"] = "done"
    except TranscriptionError as exc:
        TASKS[task_id]["cleanup"].extend(exc.cleanup)
        TASKS[task_id]["error"] = str(exc)
        TASKS[task_id]["status"] = "error"
    except Exception as exc:
        TASKS[task_id]["error"] = f"Unhandled: {exc}"
        TASKS[task_id]["status"] = "error"
    finally:
        _safe_remove(input_path)
        for f in TASKS[task_id]["cleanup"]:
            _safe_remove(f)


@app.post("/translate/start")
async def translate_start(file: UploadFile = File(...)):
    task_id = uuid.uuid4().hex
    try:
        input_path = await _save_upload_to_temp(file, task_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {exc}")

    TASKS[task_id] = {
        "status": "processing",
        "input_path": input_path,
        "media": file.content_type or "",
        "result": None,
        "error": None,
        "cleanup": [],
    }

    asyncio.create_task(_process_task(task_id))
    return {"task_id": task_id}


@app.get("/translate/status")
async def translate_status(task_id: str):
    task = TASKS.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    status = task["status"]
    if status == "processing":
        return {"status": "processing"}
    if status == "done":
        return {"status": "done", "transcription": task["result"]}
    if status == "error":
        return {"status": "error", "error": task["error"] or "Unknown error"}
    return {"status": status}

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
app.include_router(health_db)
app.include_router(auth_anonymous_router)
