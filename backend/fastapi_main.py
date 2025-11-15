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
    allow_origins=["https://filety.ru", "http://localhost:3000", "http://127.0.0.1:3000", "https://filety-core.vercel.app"],
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
    buffer: BytesIO | None = None
    if file.size and file.size > MAX_SIZE_IN_MEMORY:
        fd, temp_path = tempfile.mkstemp(suffix = os.path.splitext(file.filename or "")[1] or ".tmp")
        os.close(fd)
        async for chunk in file.stream(10 * MB):
            with open(temp_path, "ab") as fh:
                fh.write(chunk)
        source = temp_path

    else:
        content = await file.read()
        buffer = BytesIO(content)
        buffer.seek(0)
        source = buffer
    
    try:
        text = await asyncio.to_thread(which_file, source, media_type=media)
        return {"transcription": text}
    except Exception as e:
        return {"error": "Transcription failed"}
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)