import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from core.database import db
from core.security import create_token, get_current_user, hash_password, verify_password
from core.utils import clean, log_activity, new_id, now_iso
from models import LoginIn, RegisterIn
from routers.health_card import new_card

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
MAX_ATTEMPTS = 5
LOCK_MINUTES = 15


def generate_patient_id() -> str:
    return f"HC{datetime.now(timezone.utc).year}{secrets.token_hex(3).upper()}"


@router.post("/register", status_code=201)
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = {
        "id": new_id(),
        "email": email,
        "name": body.name,
        "phone": body.phone,
        "role": "patient",
        "patient_id": generate_patient_id(),
        "password_hash": hash_password(body.password),
        "is_active": True,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    await db.health_cards.insert_one(new_card(user))
    await log_activity(user, "register", "New patient account created")
    return {"token": create_token(user), "user": clean(user)}


@router.post("/login")
async def login(body: LoginIn, request: Request):
    email = body.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    now = datetime.now(timezone.utc)
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("locked_until") and datetime.fromisoformat(attempt["locked_until"]) > now:
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        count = (attempt or {}).get("count", 0) + 1
        update = {"count": count, "locked_until": None}
        if count >= MAX_ATTEMPTS:
            update = {"count": 0, "locked_until": (now + timedelta(minutes=LOCK_MINUTES)).isoformat()}
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled. Contact the administrator.")

    await db.login_attempts.delete_many({"identifier": identifier})
    await log_activity(user, "login", "User signed in")
    return {"token": create_token(user), "user": clean(user)}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    await log_activity(user, "logout", "User signed out")
    return {"message": "Logged out"}
