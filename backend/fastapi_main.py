from fastapi import FastAPI, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO
import asyncio
from backend.transcription import which_file, TranscriptionError
import os
import tempfile


MB = 1024 * 1024
MAX_SIZE_IN_MEMORY = 5 * MB


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
