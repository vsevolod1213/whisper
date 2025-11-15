from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO
import asyncio
from backend.transcription import which_file
import os
import tempfile

MB = 1024 * 1024
MAX_SIZE_IN_MEMORY = 5 * MB

app = FastAPI(title="Failety API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://filety.ru",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://filety-core.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

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

        async for chunk in file.stream(2 * MB):
            total_size += len(chunk)
            with open(temp_path, "ab") as f:
                f.write(chunk)

        source = temp_path

    cleanup_files = []

    try:
        text, clean = await asyncio.to_thread(which_file, source, media_type=media)
        cleanup_files.extend(clean)
        return {"transcription": text}

    except Exception as e:
        return {"error": "Transcription failed", "details": str(e)}

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

        for f in cleanup_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except:
                pass
