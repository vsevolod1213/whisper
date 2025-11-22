# backend/api/v1/auth_anonymous.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.core.deps import get_db
from backend.models.anon_users import AnonUser
from backend.schemas.anon_user import AnonUserResponse, AnonUserRequest, DAILY_ANON_USER_LIMIT

router = APIRouter(tags=["auth_anonymous"])

@router.post("/auth/anonymous", response_model=AnonUserResponse)
def auth_anonymous(
    payload: AnonUserRequest,
    db: Session = Depends(get_db)
) -> AnonUserResponse:
    
    anon: AnonUser | None = None

    if payload.uuid:
        stmt = select(AnonUser).where(AnonUser.uuid == payload.uuid)
        anon = db.execute(stmt).scalars().first()
        
    if anon is None:
        anon = AnonUser()
        db.add(anon)
        db.commit()
        db.refresh(anon)

    return AnonUserResponse(
        uuid = str(anon.uuid),
        created_at = anon.created_at,
        daily_limit_time=DAILY_ANON_USER_LIMIT,
        daily_used_time=anon.daily_used_time
    )
