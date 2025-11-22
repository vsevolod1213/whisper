# backend/models/users.py
from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import List, TYPE_CHECKING
from backend.db.session import Base
if TYPE_CHECKING:
    from backend.models.transcription_tasks import TranscriptionTask

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True
        )
    email: Mapped[str] = mapped_column(
        String(255), 
        unique=True, 
        index=True, 
        nullable=False
        )
    hashed_password: Mapped[str] = mapped_column(
        String(255), 
        nullable=False
        )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=datetime.utcnow, 
        nullable=False
        )
    tariff_plan: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
        ) # 0 - free, 1 - pro, 2 - enterprise
    daily_used_time: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
        )
    transcription_tasks: Mapped[List["TranscriptionTask"]] = relationship(
        back_populates="user", 
        cascade="all, delete-orphan"
        )