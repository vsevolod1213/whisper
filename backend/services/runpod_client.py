#backend/services/runpod_client.py

import os
import base64
import httpx
from backend.core.config import get_settings
import boto3
from uuid import uuid4

settings = get_settings()
RUNPOD_API = settings.runpod_api
RUNPOD_ID = settings.runpod_id

RUNPOD_RUN_URL = f"https://api.runpod.ai/v2/{RUNPOD_ID}/run"
RUNPOD_STATUS_URL = f"https://api.runpod.ai/v2/{RUNPOD_ID}/status"

if not all([
    settings.s3_access_id,
    settings.s3_access_secret,
    settings.s3_bucket_name,
    settings.s3_endpoint_url,
]):
    raise RuntimeError("S3 config is not fully set in environment variables")

s3_client = boto3.client(
    's3',  
    aws_access_key_id=settings.s3_access_id,
    aws_secret_access_key=settings.s3_access_secret,
    endpoint_url=settings.s3_endpoint_url,
    region_name="eu-ro-1"

)

class RunpodError(Exception):
    pass

async def submit_audio_job(
        audio_path: str,
        task_id: int,
        model_name: str = "openai/whisper-large-v2",
        language: str | None = None,
    ) -> str:
    file_name = os.path.basename(audio_path)

    object_key = f"audio_inputs/{task_id}/{uuid4().hex}_{file_name}"
    s3_client.upload_file(audio_path, settings.s3_bucket_name, object_key)

    payload = {
        "input": {
            "task_id": task_id,
            "model_name": model_name,
            "language": language,
            "filename": file_name,
            "s3_object_key": object_key,
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