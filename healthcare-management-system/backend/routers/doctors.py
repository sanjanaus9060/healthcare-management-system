from datetime import date as date_cls, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from core.database import db
from core.security import get_current_user, require_roles
from core.utils import ACCESS_STATUSES, local_now, log_activity
from models import DoctorProfileUpdate

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])
DOCTOR_FIELDS = {
    "_id": 0, "id": 1, "name": 1, "specialization": 1, "qualification": 1,
    "experience_years": 1, "bio": 1, "available_days": 1, "slots": 1,
}
MAX_BOOKING_DAYS = 90


def validate_booking_window(doctor: dict, day: date_cls, time: str | None = None):
    today = local_now().date()
    if day < today:
        raise HTTPException(status_code=422, detail="Appointment date cannot be in the past")
    if day > today + timedelta(days=MAX_BOOKING_DAYS):
        raise HTTPException(status_code=422, detail=f"Appointments can be booked up to {MAX_BOOKING_DAYS} days ahead")
    if day.weekday() not in doctor.get("available_days", []):
        raise HTTPException(status_code=422, detail="The doctor is not available on this day")
    if time is not None:
        if time not in doctor.get("slots", []):
            raise HTTPException(status_code=422, detail="Selected time is not one of the doctor's slots")
        if day == today and time <= local_now().strftime("%H:%M"):
            raise HTTPException(status_code=422, detail="Selected time has already passed")


async def get_doctor(doctor_id: str) -> dict:
    doctor = await db.users.find_one({"id": doctor_id, "role": "doctor", "is_active": True}, DOCTOR_FIELDS)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@router.get("")
async def list_doctors(specialization: str | None = None, user: dict = Depends(get_current_user)):
    query = {"role": "doctor", "is_active": True}
    if specialization:
        query["specialization"] = specialization
    return await db.users.find(query, DOCTOR_FIELDS).sort("name", 1).to_list(200)


@router.get("/me/patients")
async def my_patients(user: dict = Depends(require_roles("doctor"))):
    appts = await db.appointments.find(
        {"doctor_user_id": user["id"], "status": {"$in": ACCESS_STATUSES}}, {"_id": 0}
    ).sort("date", -1).to_list(1000)
    patients = {}
    for a in appts:
        p = patients.setdefault(a["patient_user_id"], {
            "patient_user_id": a["patient_user_id"],
            "patient_name": a["patient_name"],
            "patient_code": a["patient_code"],
            "last_visit": a["date"],
            "appointments": 0,
        })
        p["appointments"] += 1
    async for c in db.access_controls.find({"doctor_user_id": user["id"]}, {"_id": 0}):
        if not c["allowed"]:
            patients.pop(c["patient_user_id"], None)
        elif c["patient_user_id"] not in patients:
            card = await db.health_cards.find_one({"patient_user_id": c["patient_user_id"]}, {"_id": 0, "name": 1, "patient_id": 1})
            if card:
                patients[c["patient_user_id"]] = {
                    "patient_user_id": c["patient_user_id"], "patient_name": card["name"],
                    "patient_code": card["patient_id"], "last_visit": None, "appointments": 0,
                }
    return list(patients.values())


@router.put("/me")
async def update_my_profile(body: DoctorProfileUpdate, user: dict = Depends(require_roles("doctor"))):
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No changes provided")
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    await log_activity(user, "doctor_profile_update", "Doctor profile updated")
    return await get_doctor(user["id"])


@router.get("/{doctor_id}")
async def doctor_detail(doctor_id: str, user: dict = Depends(get_current_user)):
    return await get_doctor(doctor_id)


@router.get("/{doctor_id}/slots")
async def doctor_slots(doctor_id: str, date: date_cls = Query(...), user: dict = Depends(get_current_user)):
    doctor = await get_doctor(doctor_id)
    validate_booking_window(doctor, date)
    booked = await db.appointments.find(
        {"doctor_user_id": doctor_id, "date": date.isoformat(), "status": {"$in": ["pending", "confirmed"]}},
        {"_id": 0, "time": 1},
    ).to_list(200)
    booked_times = {b["time"] for b in booked}
    now = local_now()
    is_today = date == now.date()
    current = now.strftime("%H:%M")
    return [
        {"time": t, "available": t not in booked_times and not (is_today and t <= current)}
        for t in doctor.get("slots", [])
    ]
