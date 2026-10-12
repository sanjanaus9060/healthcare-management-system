import os
import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from core.database import db

ACCESS_STATUSES = ["pending", "confirmed", "completed"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def local_now() -> datetime:
    return datetime.now(ZoneInfo(os.environ.get("APP_TIMEZONE", "UTC")))


def new_id() -> str:
    return str(uuid.uuid4())


def clean(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if k not in ("_id", "password_hash", "slot_lock")}


async def log_activity(user, action: str, detail: str = ""):
    await db.activity_logs.insert_one({
        "id": new_id(),
        "actor_id": user.get("id") if user else None,
        "actor_name": user.get("name") if user else "Anonymous",
        "actor_role": user.get("role") if user else None,
        "action": action,
        "detail": detail,
        "created_at": now_iso(),
    })


async def doctor_can_access(doctor_id: str, patient_user_id: str) -> bool:
    ctrl = await db.access_controls.find_one({"patient_user_id": patient_user_id, "doctor_user_id": doctor_id})
    if ctrl is not None:
        return bool(ctrl["allowed"])
    appt = await db.appointments.find_one({
        "doctor_user_id": doctor_id,
        "patient_user_id": patient_user_id,
        "status": {"$in": ACCESS_STATUSES},
    })
    return appt is not None
