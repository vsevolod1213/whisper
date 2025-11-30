# backend/fastapi_main.py
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse
from slowapi.middleware import SlowAPIMiddleware

import asyncio
from backend.transcription import which_file, TranscriptionError
import os
import uuid
from pathlib import Path
from backend.api.v1.health import router as health_db
from backend.db.session import engine
from backend.db.base import Base
from backend.api.v1.auth_anonymous import router as auth_anonymous_router
from backend.api.v1.auth_users import router as auth_users_router
import subprocess
from backend.db.session import SessionLocal
from backend.models.transcription_tasks import TranscriptionStatus, TranscriptionTask
from backend.models.anon_users import AnonUser
import math
from uuid import UUID as UUID_cls
from backend.schemas.anon_user import DAILY_LIMIT_ANON_USER
from sqlalchemy import select, delete
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

MB = 1024 * 1024

TASKS_DIR = Path("/root/filety/backend/tasks")
TASKS_DIR.mkdir(parents=True, exist_ok=True)
TASKS: dict[str, dict] = {}

limiter = Limiter(key_func = get_remote_address)
app = FastAPI(title="Failety API")

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RateLimitExceeded)
def ratelimit_handler(request, exc):
    return JSONResponse(
        status_code = 429,
        content = {"detail": "Too many requests"}
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

def get_media_seconds(path: str) -> int:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                path,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
        )
        duration_str = result.stdout.strip()
        if not duration_str:
            raise ValueError("Negative duration from ffprobe")
        duration = float(duration_str)
        if duration < 0:
            raise ValueError("Negative duration from ffprobe")
        return max(1, math.ceil(duration))
    except Exception as exc:
        raise RuntimeError(f"Failed to get media duration: {exc}") from exc
    
async def _process_task(task_id: str):
    task_info = TASKS.get(task_id)
    if not task_info:
        return
    input_path = task_info["input_path"]
    media = task_info["media"]
    db_task_id: int | None = task_info.get("db_task_id")
    duration_seconds: int | None = task_info.get("duration_seconds")
    try:
        if db_task_id is not None:
            db = SessionLocal()
            try:
                db_task = db.get(TranscriptionTask, db_task_id)
                if db_task:
                    db_task.status = TranscriptionStatus.IN_PROGRESS
                    db.commit()
            finally:
                db.close()
        
        text, cleanup = await asyncio.to_thread(which_file, input_path, media_type=media)
        TASKS[task_id]["cleanup"].extend(cleanup)
        TASKS[task_id]["result"] = text
        TASKS[task_id]["status"] = "done"

        if db_task_id is not None:
            db = SessionLocal()
            try:
                db_task = db.get(TranscriptionTask, db_task_id)
                if db_task:
                    db_task.status = TranscriptionStatus.COMPLETED
                    db_task.transcription_text = text

                    if (
                        db_task.anon_user_id is not None
                        and duration_seconds is not None
                        and duration_seconds > 0
                    ):
                        anon_user = db.get(AnonUser, db_task.anon_user_id)
                        if anon_user:
                            anon_user.daily_used_time += duration_seconds
                    db.commit()
            finally:
                db.close()
    except TranscriptionError as exc:
        TASKS[task_id]["cleanup"].extend(exc.cleanup)
        TASKS[task_id]["error"] = str(exc)
        TASKS[task_id]["status"] = "error"

        if db_task_id is not None:
            db = SessionLocal()
            try:
                db_task = db.get(TranscriptionTask, db_task_id)
                if db_task: 
                    db_task.status = TranscriptionStatus.FAILED
                    db.commit()
            finally:
                db.close() 
    except Exception as exc:
        TASKS[task_id]["error"] = f"Unhandled: {exc}"
        TASKS[task_id]["status"] = "error"

        if db_task_id is not None:
            db = SessionLocal()
            try:
                db_task = db.get(TranscriptionTask, db_task_id)
                if db_task:
                    db_task.status = TranscriptionStatus.FAILED
                    db.commit()
            finally:
                db.close()
    finally:
        _safe_remove(input_path)
        for f in TASKS[task_id]["cleanup"]:
            _safe_remove(f)


@app.post("/translate/start")
async def translate_start(file: UploadFile = File(...), anon_uuid: str | None = Form(None)):
    if anon_uuid is None:
        raise HTTPException(
            status_code=400, 
            detail="anon_uuid is required"
            )
    
    task_id = uuid.uuid4().hex

    try:
        input_path = await _save_upload_to_temp(file, task_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {exc}")
    
    try:
        duration_seconds = get_media_seconds(input_path)
    except Exception as exc:
        _safe_remove(input_path)
        raise HTTPException(status_code=400, detail=f"Failed to get media duration: {exc}")
    
    try:
        anon_user_obj = UUID_cls(anon_uuid)
    except ValueError:
        _safe_remove(input_path)
        raise HTTPException(status_code=400, detail="Invalid anon_uuid format")
    db = SessionLocal()
    anon_user: AnonUser | None = None
    db_task: TranscriptionTask | None = None
    try:
        stmt = select(AnonUser).where(AnonUser.uuid == anon_user_obj)
        anon_user = db.execute(stmt).scalars().first()

        if anon_user is None:
            anon_user = AnonUser(uuid=anon_user_obj)
            db.add(anon_user)
            db.commit()
            db.refresh(anon_user)
        used = anon_user.daily_used_time or 0
        limit = DAILY_LIMIT_ANON_USER
        remaining = limit - used
        if remaining <= 0 or duration_seconds > remaining:
            _safe_remove(input_path)
            raise HTTPException(
                status_code=400, 
                detail="Daily limit exceeded"
                )
        
        db_task = TranscriptionTask(
            anon_user_id=anon_user.id,
            status=TranscriptionStatus.PENDING,
            transcription_text=None,
            transcription_json=None
        )
        db.add(db_task)
        db.commit()
        db.refresh(db_task)
    except HTTPException:
        db.close()
        raise
    except Exception as exc:
        db.close()
        _safe_remove(input_path)
        raise HTTPException(status_code=500, detail = f"DB error: {exc}")
    db.close()


    TASKS[task_id] = {
        "status": "processing",
        "input_path": input_path,
        "media": file.content_type or "",
        "result": None,
        "error": None,
        "cleanup": [],
        "db_task_id": db_task.id if db_task else None,
        "duration_seconds": duration_seconds,
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


ANON_TTL_SECONDS = 24 * 3600
ANON_CLEANUP_INTERVAL = 1 * 3600

def _cleanup_anon_users(db: Session)->int:
    cutoff = datetime.utcnow() - timedelta(seconds=ANON_TTL_SECONDS)
    expired_anon_ids =(
        db.execute(
            select(AnonUser.id).where(AnonUser.created_at < cutoff)
        )
        .scalars()
        .all()
    )
    if not expired_anon_ids:
        return 0
    db.execute(
        delete(AnonUser).where(AnonUser.id.in_(expired_anon_ids))
    )
    db.commit()
    return len(expired_anon_ids)

async def _anon_cleanup_loop():
    while True:
        try:
            db = SessionLocal()
            deleted = _cleanup_anon_users(db)
            if deleted:
                print(f"[cleanup] Deleted {deleted} expired anon users")
        except Exception as exc:
            print(f"[cleanup] Error during anon cleanup: {exc}")
        finally:
            try:
                db.close()
            except Exception:
                pass
        await asyncio.sleep(ANON_CLEANUP_INTERVAL)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind = engine)
app.include_router(health_db)
app.include_router(auth_anonymous_router)
app.include_router(auth_users_router)

@app.on_event("startup")
async def startup_cleanup_task():
    asyncio.create_task(_anon_cleanup_loop())
