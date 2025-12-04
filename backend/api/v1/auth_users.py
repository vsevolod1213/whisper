#backend/api/v1/auth_users.py
from datetime import datetime, timedelta, timezone
import hashlib
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.core.deps import get_db
from backend.core.security import (
    hashed_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from backend.core.config import get_settings
from backend.models.users import User
from backend.models.refresh_sessions import RefreshSession
from backend.schemas.auth import UserCreate, UserLogin, UserOut

router = APIRouter(prefix = "/auth", tags = ["auth"])
settings = get_settings()

limiter = Limiter(key_func=get_remote_address)

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/"

def _now() -> datetime:
    return datetime.now(timezone.utc)

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

auth_scheme = HTTPBearer()
auth_scheme_optional = HTTPBearer(auto_error = False)

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(auth_scheme),
    db: Session = Depends(get_db)
):
    token = creds.credentials
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code = status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    if payload.get("type") != "access":
        raise HTTPException(status_code = status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    
    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code = status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    return user
def get_current_user_optional(
    creds: HTTPAuthorizationCredentials | None = Security(auth_scheme_optional),
    db: Session = Depends(get_db)
):
    if creds is None:
        return None
    
    token = creds.credentials
    try:
        payload = decode_token(token)
    except Exception:
        return None
    
    if payload.get("type") != "access":
        return None
    
    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    return user

@router.post("/register", response_model = UserOut, status_code = 201)
@limiter.limit("3/minute")
def register(request: Request, data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code = 400, detail="Email already registered")

    user = User(
        email = data.email,
        hashed_password = hashed_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login")
@limiter.limit("5/minute")
def login(
    data: UserLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    now = _now()
    expires_at = now + timedelta(days = settings.refresh_token_expire_days)

    session = RefreshSession(
        user_id = user.id,
        token_hash = "TEMP",
        expires_at = expires_at,
        user_agent = request.headers.get("user-agent"),
        ip = request.client.host if request.client else None
    )
    db.add(session)
    db.flush()

    refresh_token = create_refresh_token(
        sub = str(user.id),
        session_id = session.id
    )
    session.token_hash = _hash_token(refresh_token)
    db.commit()

    access_token = create_access_token(sub = str(user.id))

    response.set_cookie(
        key = REFRESH_COOKIE_NAME,
        value = refresh_token,
        httponly = True,
        secure = True,
        samesite = "lax",
        path = REFRESH_COOKIE_PATH,
        max_age = settings.refresh_token_expire_days * 24 * 60 * 60
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/refresh")
def refresh_token(
    request: Request,
    db: Session = Depends(get_db)
):
    raw_refresh = request.cookies.get(REFRESH_COOKIE_NAME)

    if not raw_refresh:
        raise HTTPException(status_code = status.HTTP_401_UNAUTHORIZED, detail = "No refresh token")
    
    try:
        payload = decode_token(raw_refresh)
    except Exception:
        raise HTTPException(status_code = status.HTTP_401_UNAUTHORIZED, detail = "Invalid token")
    
    if payload.get("type") != "refresh":
        raise HTTPException(status_code = status.HTTP_401_UNAUTHORIZED, detail = "Invalid token type")
    
    user_id = int(payload["sub"])
    session_id = int(payload["sid"])
    token_hash = _hash_token(raw_refresh)

    session = (
        db.query(RefreshSession).filter(
            RefreshSession.id == session_id,
            RefreshSession.user_id == user_id,
            RefreshSession.token_hash == token_hash,
            RefreshSession.is_revoked == False
        ).first()
    )
    if not session:
        raise HTTPException(status_code = status.HTTP_401_UNAUTHORIZED, detail = "Session revoked or not found")
    
    if session.expires_at < _now():
        raise HTTPException(status_code = status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    
    access_token = create_access_token(sub = str(user_id))
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    raw_refresh = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_refresh:
        try:
            payload = decode_token(raw_refresh)
            if payload.get("type") == "refresh":
                user_id = int(payload["sub"])
                session_id = int(payload["sid"])
                token_hash = _hash_token(raw_refresh)

                session = (
                    db.query(RefreshSession).filter(
                        RefreshSession.id == session_id,
                        RefreshSession.user_id == user_id,
                        RefreshSession.token_hash == token_hash,
                        RefreshSession.is_revoked == False
                    ).first()
                )
                if session:
                    session.is_revoked = True
                    db.commit()
        except Exception:
            pass

    response.delete_cookie(REFRESH_COOKIE_NAME, path = REFRESH_COOKIE_PATH)
    return {"detail": "Logged out"}
                
@router.post("/logout_all")
def logout_all(
    current_user: User = Depends(get_current_user),
    response: Response = None,
    db: Session = Depends(get_db)
):
    db.query(RefreshSession).filter(
        RefreshSession.user_id == current_user.id,
        RefreshSession.is_revoked == False
    ).update({"is_revoked": True})
    db.commit()

    if response is not None:
        response.delete_cookie(REFRESH_COOKIE_NAME, path = REFRESH_COOKIE_PATH)

    return {"detail": "Logged out from all session"}

@router.get("/me", response_model = UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user