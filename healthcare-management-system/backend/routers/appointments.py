from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError

from core.database import db
from core.security import get_current_user, require_roles
from core.utils import clean, log_activity, new_id, now_iso
from models import AppointmentCreate, StatusUpdate
from routers.doctors import get_doctor, validate_booking_window

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])
ACTIVE = ["pending", "confirmed"]
TRANSITIONS = {"pending": {"confirmed", "cancelled"}, "confirmed": {"completed", "cancelled"}}


@router.post("", status_code=201)
async def book(body: AppointmentCreate, user: dict = Depends(require_roles("patient"))):
    doctor = await get_doctor(body.doctor_id)
    validate_booking_window(doctor, body.date, body.time)
    day = body.date.isoformat()
    if await db.appointments.find_one({"doctor_user_id": doctor["id"], "date": day, "time": body.time, "status": {"$in": ACTIVE}}):
        raise HTTPException(status_code=409, detail="This slot is already booked. Please choose another time.")
    if await db.appointments.find_one({"patient_user_id": user["id"], "date": day, "time": body.time, "status": {"$in": ACTIVE}}):
        raise HTTPException(status_code=409, detail="You already have an appointment at this time")
    appt = {
        "id": new_id(),
        "patient_user_id": user["id"],
        "patient_name": user["name"],
        "patient_code": user.get("patient_id"),
        "doctor_user_id": doctor["id"],
        "doctor_name": doctor["name"],
        "specialization": doctor.get("specialization"),
        "date": day,
        "time": body.time,
        "reason": body.reason.strip(),
        "status": "pending",
        "doctor_note": None,
        "slot_lock": f"{doctor['id']}|{day}|{body.time}",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    try:
        await db.appointments.insert_one(appt)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="This slot is already booked. Please choose another time.")
    await log_activity(user, "appointment_booked", f"Booked with {doctor['name']} on {day} {body.time}")
    return clean(appt)


@router.get("/me")
async def my_appointments(status: str | None = None, user: dict = Depends(require_roles("patient", "doctor"))):
    key = "patient_user_id" if user["role"] == "patient" else "doctor_user_id"
    query = {key: user["id"]}
    if status:
        query["status"] = status
    return await db.appointments.find(query, {"_id": 0, "slot_lock": 0}).sort([("date", -1), ("time", -1)]).to_list(500)


async def _load(appt_id: str) -> dict:
    appt = await db.appointments.find_one({"id": appt_id}, {"_id": 0})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt


async def _set_status(appt: dict, status: str, user: dict, note: str | None = None) -> dict:
    update = {"$set": {"status": status, "updated_at": now_iso()}}
    if note is not None:
        update["$set"]["doctor_note"] = note
    if status in ("cancelled", "completed"):
        update["$unset"] = {"slot_lock": ""}
        if status == "cancelled":
            update["$set"]["cancelled_by"] = user["role"]
    await db.appointments.update_one({"id": appt["id"]}, update)
    await log_activity(user, f"appointment_{status}", f"Appointment on {appt['date']} {appt['time']} marked {status}")
    return clean(await _load(appt["id"]))


@router.patch("/{appt_id}/cancel")
async def cancel(appt_id: str, user: dict = Depends(get_current_user)):
    appt = await _load(appt_id)
    allowed = (
        user["role"] == "admin"
        or (user["role"] == "patient" and appt["patient_user_id"] == user["id"])
        or (user["role"] == "doctor" and appt["doctor_user_id"] == user["id"])
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="You cannot cancel this appointment")
    if appt["status"] not in ACTIVE:
        raise HTTPException(status_code=400, detail=f"A {appt['status']} appointment cannot be cancelled")
    return await _set_status(appt, "cancelled", user)


@router.patch("/{appt_id}/status")
async def update_status(appt_id: str, body: StatusUpdate, user: dict = Depends(require_roles("doctor", "admin"))):
    appt = await _load(appt_id)
    if user["role"] == "doctor" and appt["doctor_user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="This appointment is not assigned to you")
    if body.status not in TRANSITIONS.get(appt["status"], set()):
        raise HTTPException(status_code=400, detail=f"Cannot change status from {appt['status']} to {body.status}")
    return await _set_status(appt, body.status, user, body.note)
