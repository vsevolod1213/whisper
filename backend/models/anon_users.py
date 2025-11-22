# backend/models/anon_users.py
from sqlalchemy import DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from typing import List, TYPE_CHECKING
from backend.db.session import Base
if TYPE_CHECKING:
    from backend.models.transcription_tasks import TranscriptionTask

class AnonUser(Base):
    __tablename__ = "anon_users"

    id: Mapped[int] = mapped_column(
        primary_key=True
        )
    uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid = True), 
        unique=True, 
        index=True, 
        nullable=False, 
        default=uuid.uuid4
        )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=datetime.utcnow, 
        nullable=False
        )
    daily_used_time: Mapped[int] = mapped_column(
        Integer,
        nullable=False, 
        default=0
        )
    transcription_tasks: Mapped[List["TranscriptionTask"]] = relationship(
        back_populates="anon_user", 
        cascade="all, delete-orphan"
        )