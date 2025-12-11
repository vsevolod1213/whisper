#backend/services/runpod_client.py

import os
import base64
import httpx
from backend.core.config import get_settings

settings = get_settings()
RUNPOD_API = settings.runpod_api
RUNPOD_ID = settings.runpod_id

RUNPOD_RUN_URL = f"https://api.runpod.io/v2/{RUNPOD_ID}/run"
RUNPOD_STATUS_URL = f"https://api.runpod.ai/v2/{RUNPOD_ID}/status"

class RunpodError(Exception):
    pass

async def submit_audio_job(
        audio_path: str,
        task_id: int,
        model_name: str = "openai/whisper-large-v2",
        language: str | None = None,
    ) -> str:
    file_name = os.path.basename(audio_path)

    with open(audio_path, "rb") as audio_file:
        bynary = audio_file.read()

    audio_b64 = base64.b64encode(bynary).decode('utf-8')

    payload = {
        "input": {
            "task_id": task_id,
            "model_name": model_name,
            "language": language,
            "file_name": file_name,
            "audio_base64": audio_b64,  
        }
    }
    headers = {
        "Authorization": RUNPOD_API,
        "Content-Type": "application/json",
    }   

    async with httpx.AsyncClient(timeout=300) as client: 
        resp = await client.post(RUNPOD_RUN_URL, json=payload, headers=headers)
        if resp.status_code != 200:
            raise RunpodError(f"Runpod API error: {resp.status_code} - {resp.text}")
        data = resp.json()
        job_id = data.get("id")
        if not job_id:
            raise RunpodError(f"Runpod API error: Missing job ID in response - {data}")
        return job_id
    
    async def get_job_status(job_id: str) -> dict:
        url = f"{RUNPOD_STATUS_URL}/{job_id}"
        headers = {
            "Authorization": RUNPOD_API
        }       
    
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(url, headers=headers)
            
        if resp.status_code != 200:
            raise RunpodError(f"Runpod API error: {resp.status_code} - {resp.text}")
        return resp.json()