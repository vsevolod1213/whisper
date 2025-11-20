from typing import Generator
from sqlalchemy.orm import Session
from backend.db.session import SessinonLocal

def get_db() -> Generator[Session, None, None]:
    db = SessinonLocal()
    try:
        yield db
    finally:
        db.close()