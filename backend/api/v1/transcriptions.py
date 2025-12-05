#backend/api/v1/transcriptions.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.core.deps import get_db
from backend.api.v1.auth_users import get_current_user_optional
from backend.models.transcription_tasks import TranscriptionTask
from backend.models.anon_users import AnonUser
from backend.schemas.transcriptions import TranscriptionItem
from uuid import UUID as UUID_cls

router = APIRouter(prefix="/transcriptions", tags=["transcriptions"])

@router.get("/recent", response_model=list[TranscriptionItem])
def recent_transcriptions(
    anon_uuid: str | None = Query(None),
    db: Session = Depends(get_db),
    user = Depends(get_current_user_optional)
    ):
    tasks = []

    if anon_uuid and user is None:
        try:
            anon_uuid_obj = UUID_cls(anon_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid anon user UUID")

        anon = db.execute(
            select(AnonUser).where(AnonUser.uuid == anon_uuid_obj)
            ).scalars().first()

        if anon:
            stmb = (select(
                TranscriptionTask
                ).where(
                TranscriptionTask.anon_user_id == anon.id
                ).order_by(
                    TranscriptionTask.created_at.desc()
                    ))
            tasks = db.execute(stmb).scalars().all()
            
    else:
        stmb = (select(
            TranscriptionTask
            ).where(
            TranscriptionTask.user_id == user.id
            ).order_by(
                TranscriptionTask.created_at.desc()
                ))
        tasks = db.execute(stmb).scalars().all()

    result: list[TranscriptionItem] = []
    for task in tasks:
        result.append(TranscriptionItem(
            id=task.id,
            created_at=task.created_at,
            status=task.status,
            text=task.transcription_text or ""
            )
        )

    return result
        
