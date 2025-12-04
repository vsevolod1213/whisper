#backend/core/limits.py
from typing import Optional
from backend.models.users import User

DAILY_LIMIT_ANON_USER: int = 540

DAILY_LIMIT_FREE_USER: int = 720
DAILY_LIMIT_PLUS_USER: int = 3600
DAILY_LIMIT_PRO_USER: int = 6000
DAILY_LIMIT_PREMIUM_USER: Optional[int] = None  

def get_daily_limit_for_user(user: "User") -> int | None:
    if user.tariff_plan == 0:
        return DAILY_LIMIT_FREE_USER
    elif user.tariff_plan == 1:
        return DAILY_LIMIT_PLUS_USER
    elif user.tariff_plan == 2:
        return DAILY_LIMIT_PRO_USER
    elif user.tariff_plan == 3:
        return DAILY_LIMIT_PREMIUM_USER
    else:
        return DAILY_LIMIT_FREE_USER