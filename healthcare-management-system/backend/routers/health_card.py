import secrets

from fastapi import APIRouter, Depends, HTTPException

from core.database import db
from core.security import get_current_user, require_roles
from core.utils import clean, doctor_can_access, log_activity, now_iso
from models import HealthCardUpdate

router = APIRouter(prefix="/api/health-card", tags=["Digital health card"])


def new_card(user: dict) -> dict:
    return {
        "patient_user_id": user["id"],
        "patient_id": user["patient_id"],
        "name": user["name"],
        "email": user["email"],
        "phone": user.get("phone"),
        "blood_group": None,
        "date_of_birth": None,
        "gender": None,
        "address": None,
        "emergency_contact": None,
        "allergies": [],
        "chronic_conditions": [],
        "qr_token": secrets.token_urlsafe(16),
        "issued_at": now_iso(),
        "updated_at": now_iso(),
    }


async def _get_card(patient_user_id: str) -> dict:
    card = await db.health_cards.find_one({"patient_user_id": patient_user_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Health card not found")
    return card


@router.get("/me")
async def my_card(user: dict = Depends(require_roles("patient"))):
    return await _get_card(user["id"])


@router.put("/me")
async def update_card(body: HealthCardUpdate, user: dict = Depends(require_roles("patient"))):
    updates = body.model_dump(exclude_unset=True, mode="json")
    if not updates:
        raise HTTPException(status_code=400, detail="No changes provided")
    updates["updated_at"] = now_iso()
    await db.health_cards.update_one({"patient_user_id": user["id"]}, {"$set": updates})
    if "phone" in updates:
        await db.users.update_one({"id": user["id"]}, {"$set": {"phone": updates["phone"]}})
    await log_activity(user, "health_card_update", "Health card details updated")
    return await _get_card(user["id"])


@router.post("/me/regenerate-qr")
async def regenerate_qr(user: dict = Depends(require_roles("patient"))):
    await db.health_cards.update_one(
        {"patient_user_id": user["id"]},
        {"$set": {"qr_token": secrets.token_urlsafe(16), "updated_at": now_iso()}},
    )
    await log_activity(user, "qr_regenerated", "Previous health card QR code revoked")
    return await _get_card(user["id"])


@router.get("/verify/{token}")
async def verify_card(token: str):
    card = await db.health_cards.find_one({"qr_token": token}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="This QR code is invalid or has been revoked")
    parts = card["name"].split()
    display = parts[0] + (f" {parts[-1][0]}." if len(parts) > 1 else "")
    return {
        "valid": True,
        "patient_id": card["patient_id"],
        "display_name": display,
        "patient_user_id": card["patient_user_id"],
        "message": "Card is valid. Medical information requires an authorized clinician login.",
    }


@router.get("/patient/{patient_user_id}")
async def patient_card(patient_user_id: str, user: dict = Depends(require_roles("doctor"))):
    if not await doctor_can_access(user["id"], patient_user_id):
        raise HTTPException(status_code=403, detail="You are not authorized to view this patient's card")
    card = await _get_card(patient_user_id)
    card.pop("qr_token", None)
    return clean(card)


@router.get("/status")
async def card_status(user: dict = Depends(get_current_user)):
    return {"has_card": user["role"] == "patient"}
