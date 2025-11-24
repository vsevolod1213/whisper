#backend/models/transcription_tasks.py
from sqlalchemy import String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from backend.db.session import Base
from typing import Optional, TYPE_CHECKING
if TYPE_CHECKING:
    from backend.models.users import User
    from backend.models.anon_users import AnonUser

class TranscriptionStatus:
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class TranscriptionTask(Base):
    __tablename__ = "transcription_tasks"

    id: Mapped[int] = mapped_column(
        primary_key=True
        )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow, 
        nullable=False
        )
    user_id: Mapped[int|None] = mapped_column(
        ForeignKey("users.id"), 
        nullable=True,
        index=True
        )
    anon_user_id: Mapped[int|None] = mapped_column(
        ForeignKey("anon_users.id", ondelete="CASCADE"), 
        nullable=True,
        index=True
        )
    status: Mapped[str] = mapped_column(
        String(50), 
        default=TranscriptionStatus.PENDING, 
        nullable=False
        )
    transcription_text: Mapped[Optional[str]] = mapped_column(
        Text, 
        nullable=True
        )
    transcription_json: Mapped[Optional[dict]] = mapped_column(
        JSON, 
        nullable=True
        )
    user: Mapped[Optional["User"]] = relationship(
        back_populates="transcription_tasks", 
        lazy="joined"
        )
    anon_user: Mapped[Optional["AnonUser"]] = relationship(
        back_populates="transcription_tasks", 
        lazy="joined"
        )