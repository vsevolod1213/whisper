from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.core.deps import get_db

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/db")
#простой запрос для проверки
def health_db(db: Session = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
    