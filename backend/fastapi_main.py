from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from backend.transcription import which_file

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
    content = await file.read()
    try:
        text = await asyncio.to_thread(which_file, content, media_type=file.content_type)
        return {"transcription": text}
    except Exception as e:
        return {"error": "Transcription failed"}