from fastapi import APIRouter, Depends, HTTPException

from core.database import db
from core.security import hash_password, require_roles
from core.utils import clean, log_activity, new_id, now_iso
from models import AdminDoctorCreate, AdminUserUpdate

router = APIRouter(prefix="/api/admin", tags=["Administration"])
admin_only = require_roles("admin")
USER_FIELDS = {
    "_id": 0, "id": 1, "name": 1, "email": 1, "phone": 1, "role": 1, "is_active": 1, "created_at": 1,
    "patient_id": 1, "specialization": 1, "qualification": 1, "experience_years": 1,
}
DEFAULT_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"]


@router.get("/stats")
async def stats(admin: dict = Depends(admin_only)):
    by_status = {}
    for s in ["pending", "confirmed", "completed", "cancelled"]:
        by_status[s] = await db.appointments.count_documents({"status": s})
    specs = {}
    async for d in db.users.find({"role": "doctor"}, {"_id": 0, "specialization": 1}):
        key = d.get("specialization") or "General"
        specs[key] = specs.get(key, 0) + 1
    return {
        "patients": await db.users.count_documents({"role": "patient"}),
        "doctors": await db.users.count_documents({"role": "doctor"}),
        "active_users": await db.users.count_documents({"is_active": True}),
        "disabled_users": await db.users.count_documents({"is_active": False}),
        "appointments": sum(by_status.values()),
        "appointments_by_status": by_status,
        "medical_records": await db.medical_records.count_documents({}),
        "ai_conversations": await db.ai_messages.count_documents({"role": "user"}),
        "doctors_by_specialization": specs,
    }


@router.get("/users")
async def list_users(role: str | None = None, admin: dict = Depends(admin_only)):
    query = {"role": role} if role else {}
    return await db.users.find(query, USER_FIELDS).sort("created_at", -1).to_list(1000)


@router.post("/doctors", status_code=201)
async def create_doctor(body: AdminDoctorCreate, admin: dict = Depends(admin_only)):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    doctor = {
        "id": new_id(), "email": email, "name": body.name.strip(), "phone": body.phone, "role": "doctor",
        "specialization": body.specialization, "qualification": body.qualification,
        "experience_years": body.experience_years, "bio": None,
        "available_days": sorted(set(d for d in body.available_days if 0 <= d <= 6)) or [0, 1, 2, 3, 4],
        "slots": DEFAULT_SLOTS, "password_hash": hash_password(body.password),
        "is_active": True, "created_at": now_iso(),
    }
    await db.users.insert_one(doctor)
    await log_activity(admin, "doctor_created", f"Created doctor account for {doctor['name']}")
    return clean(doctor)


@router.patch("/users/{user_id}")
async def update_user(user_id: str, body: AdminUserUpdate, admin: dict = Depends(admin_only)):
    target = await db.users.find_one({"id": user_id}, USER_FIELDS)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No changes provided")
    if target["id"] == admin["id"] and updates.get("is_active") is False:
        raise HTTPException(status_code=400, detail="You cannot disable your own account")
    if target["role"] != "doctor" and any(k in updates for k in ("specialization", "qualification", "experience_years")):
        raise HTTPException(status_code=400, detail="Doctor fields can only be set on doctor accounts")
    await db.users.update_one({"id": user_id}, {"$set": updates})
    if target["role"] == "patient" and "name" in updates:
        await db.health_cards.update_one({"patient_user_id": user_id}, {"$set": {"name": updates["name"]}})
    await log_activity(admin, "user_updated", f"Updated {target['role']} account {target['name']}")
    return await db.users.find_one({"id": user_id}, USER_FIELDS)


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(admin_only)):
    target = await db.users.find_one({"id": user_id}, USER_FIELDS)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["role"] == "admin":
        raise HTTPException(status_code=400, detail="Administrator accounts cannot be deleted")
    key = "patient_user_id" if target["role"] == "patient" else "doctor_user_id"
    await db.appointments.update_many(
        {key: user_id, "status": {"$in": ["pending", "confirmed"]}},
        {"$set": {"status": "cancelled", "cancelled_by": "admin", "updated_at": now_iso()}, "$unset": {"slot_lock": ""}},
    )
    await db.users.delete_one({"id": user_id})
    if target["role"] == "patient":
        await db.health_cards.delete_one({"patient_user_id": user_id})
    await log_activity(admin, "user_deleted", f"Deleted {target['role']} account {target['name']}")
    return {"message": "User deleted"}


@router.get("/appointments")
async def all_appointments(admin: dict = Depends(admin_only)):
    fields = {"_id": 0, "id": 1, "patient_name": 1, "patient_code": 1, "doctor_name": 1, "specialization": 1,
              "date": 1, "time": 1, "status": 1, "created_at": 1}
    return await db.appointments.find({}, fields).sort([("date", -1), ("time", -1)]).to_list(1000)


@router.get("/activity")
async def activity(limit: int = 100, admin: dict = Depends(admin_only)):
    limit = max(1, min(limit, 500))
    return await db.activity_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
