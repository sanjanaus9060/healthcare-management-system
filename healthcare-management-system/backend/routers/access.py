from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.database import db
from core.security import require_roles
from core.utils import ACCESS_STATUSES, log_activity, now_iso

router = APIRouter(prefix="/api/access", tags=["Record access"])


class AccessUpdate(BaseModel):
    allowed: bool


async def _entries(patient_user_id: str, doctor_id: str | None = None) -> list:
    query = {"role": "doctor", "is_active": True}
    if doctor_id:
        query["id"] = doctor_id
    doctors = await db.users.find(query, {"_id": 0, "id": 1, "name": 1, "specialization": 1}).sort("name", 1).to_list(500)
    appts = await db.appointments.find(
        {"patient_user_id": patient_user_id, "status": {"$in": ACCESS_STATUSES}}, {"_id": 0, "doctor_user_id": 1}
    ).to_list(1000)
    via = {a["doctor_user_id"] for a in appts}
    ctrls = {c["doctor_user_id"]: c["allowed"] async for c in db.access_controls.find({"patient_user_id": patient_user_id}, {"_id": 0})}
    for d in doctors:
        d["via_appointment"] = d["id"] in via
        d["override"] = None if d["id"] not in ctrls else ("granted" if ctrls[d["id"]] else "revoked")
        d["has_access"] = ctrls.get(d["id"], d["via_appointment"])
    return doctors


@router.get("/me")
async def my_access(user: dict = Depends(require_roles("patient"))):
    return await _entries(user["id"])


@router.put("/me/{doctor_id}")
async def set_access(doctor_id: str, body: AccessUpdate, user: dict = Depends(require_roles("patient"))):
    doctor = await db.users.find_one({"id": doctor_id, "role": "doctor", "is_active": True}, {"_id": 0, "name": 1})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    await db.access_controls.update_one(
        {"patient_user_id": user["id"], "doctor_user_id": doctor_id},
        {"$set": {"allowed": body.allowed, "updated_at": now_iso()}},
        upsert=True,
    )
    await log_activity(user, "access_granted" if body.allowed else "access_revoked", f"Record access {'granted to' if body.allowed else 'revoked from'} {doctor['name']}")
    return (await _entries(user["id"], doctor_id))[0]
