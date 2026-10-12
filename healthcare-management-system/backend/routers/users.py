from fastapi import APIRouter, Depends, HTTPException

from core.database import db
from core.security import get_current_user, hash_password, verify_password
from core.utils import log_activity
from models import PasswordChange, ProfileUpdate

router = APIRouter(prefix="/api/users", tags=["User profile"])


@router.put("/me")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No changes provided")
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    if user["role"] == "patient":
        card_updates = {k: v for k, v in updates.items() if k in ("name", "phone")}
        await db.health_cards.update_one({"patient_user_id": user["id"]}, {"$set": card_updates})
    await log_activity(user, "profile_update", "Profile details updated")
    return await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})


@router.post("/me/password")
async def change_password(body: PasswordChange, user: dict = Depends(get_current_user)):
    doc = await db.users.find_one({"id": user["id"]})
    if not verify_password(body.current_password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    await log_activity(user, "password_change", "Password changed")
    return {"message": "Password updated"}
