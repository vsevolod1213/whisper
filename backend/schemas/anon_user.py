# backend/schemas/anon_user.py
from pydantic import BaseModel
from datetime import datetime

DAILY_LIMIT_ANON_USER = 600 

class AnonUserRequest(BaseModel):
    uuid: str | None = None

class AnonUserResponse(BaseModel):
    uuid: str
    created_at: datetime
    daily_used_time: int
    daily_limit_time: int = DAILY_LIMIT_ANON_USER


