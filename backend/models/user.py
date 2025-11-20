from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from backend.db.session import Base

class User(Base):
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False ,default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())