import re
from pathlib import PurePath

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from core.database import db
from core.security import require_roles
from core.utils import clean, doctor_can_access, log_activity, new_id, now_iso
from models import RecordCreate
from services import storage

router = APIRouter(prefix="/api/records", tags=["Medical records"])
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
FILE_TYPES = {"application/pdf": ("PDF", "pdf"), "image/png": ("PNG", "png"), "image/jpeg": ("JPEG", "jpg"), "image/webp": ("WEBP", "webp")}


def _sniff(data: bytes) -> str | None:
    if data.startswith(b"%PDF"):
        return "application/pdf"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


async def _resolve_patient(user: dict, patient_id: str | None) -> str:
    if user["role"] == "patient":
        return user["id"]
    if not patient_id:
        raise HTTPException(status_code=422, detail="patient_id is required")
    if not await doctor_can_access(user["id"], patient_id):
        raise HTTPException(status_code=403, detail="You are not authorized to add records for this patient")
    return patient_id


async def _bundle(patient_user_id: str) -> dict:
    records = await db.medical_records.find({"patient_user_id": patient_user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    card = await db.health_cards.find_one({"patient_user_id": patient_user_id}, {"_id": 0}) or {}
    return {
        "patient": {
            "patient_user_id": patient_user_id,
            "name": card.get("name"),
            "patient_id": card.get("patient_id"),
            "blood_group": card.get("blood_group"),
            "date_of_birth": card.get("date_of_birth"),
        },
        "allergies": card.get("allergies", []),
        "chronic_conditions": card.get("chronic_conditions", []),
        "records": records,
    }


@router.get("/me")
async def my_records(user: dict = Depends(require_roles("patient"))):
    return await _bundle(user["id"])


@router.get("/patient/{patient_user_id}")
async def patient_records(patient_user_id: str, user: dict = Depends(require_roles("doctor"))):
    if not await doctor_can_access(user["id"], patient_user_id):
        raise HTTPException(status_code=403, detail="You are not authorized to view this patient's records")
    await log_activity(user, "records_viewed", "Doctor viewed authorized patient records")
    return await _bundle(patient_user_id)


@router.post("", status_code=201)
async def add_record(body: RecordCreate, user: dict = Depends(require_roles("doctor", "patient"))):
    if user["role"] == "patient" and body.record_type != "document":
        raise HTTPException(status_code=403, detail="Patients can only add document records")
    patient_user_id = await _resolve_patient(user, body.patient_id)
    if body.record_type == "document" and not body.document:
        raise HTTPException(status_code=422, detail="Document details are required for document records")
    if body.record_type == "prescription" and not body.medications:
        raise HTTPException(status_code=422, detail="Add at least one medication to a prescription")
    record = {
        "id": new_id(),
        "patient_user_id": patient_user_id,
        "author_id": user["id"],
        "author_name": user["name"],
        "author_role": user["role"],
        **body.model_dump(exclude={"patient_id"}),
        "created_at": now_iso(),
    }
    await db.medical_records.insert_one(record)
    await log_activity(user, "record_added", f"Added a {body.record_type} record")
    return clean(record)


@router.post("/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str | None = Form(None),
    patient_id: str | None = Form(None),
    user: dict = Depends(require_roles("doctor", "patient")),
):
    patient_user_id = await _resolve_patient(user, patient_id)
    title = title.strip()
    if not 3 <= len(title) <= 120:
        raise HTTPException(status_code=422, detail="Title must be 3-120 characters")
    description = (description or "").strip() or None
    if description and len(description) > 2000:
        raise HTTPException(status_code=422, detail="Notes must be 2000 characters or fewer")
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if not data:
        raise HTTPException(status_code=422, detail="The selected file is empty")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 10 MB")
    mime = _sniff(data)
    if not mime:
        raise HTTPException(status_code=415, detail="Only PDF, PNG, JPEG or WEBP files are allowed")

    file_id = new_id()
    label, ext = FILE_TYPES[mime]
    try:
        stored_path = await storage.save(f"{storage.APP_PREFIX}/records/{patient_user_id}/{file_id}.{ext}", data, mime)
    except storage.StorageError:
        raise HTTPException(status_code=503, detail="File storage is temporarily unavailable. Please try again later.")
    file_name = PurePath(file.filename or f"document.{ext}").name[:120] or f"document.{ext}"
    await db.files.insert_one({
        "id": file_id, "storage_path": stored_path, "patient_user_id": patient_user_id, "uploaded_by": user["id"],
        "original_filename": file_name, "content_type": mime, "size": len(data), "is_deleted": False, "created_at": now_iso(),
    })
    record = {
        "id": new_id(), "patient_user_id": patient_user_id, "author_id": user["id"], "author_name": user["name"],
        "author_role": user["role"], "record_type": "document", "title": title, "description": description,
        "diagnosis": None, "medications": [], "appointment_id": None, "created_at": now_iso(),
        "document": {"file_id": file_id, "file_name": file_name, "file_type": label, "size_kb": max(1, round(len(data) / 1024))},
    }
    await db.medical_records.insert_one(record)
    await log_activity(user, "document_uploaded", f"Uploaded a {label} document")
    return clean(record)


@router.get("/files/{file_id}")
async def download_file(file_id: str, user: dict = Depends(require_roles("doctor", "patient"))):
    meta = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not meta:
        raise HTTPException(status_code=404, detail="File not found")
    if user["role"] == "patient" and meta["patient_user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You cannot access this file")
    if user["role"] == "doctor" and not await doctor_can_access(user["id"], meta["patient_user_id"]):
        raise HTTPException(status_code=403, detail="You are not authorized to view this patient's files")
    try:
        data = await storage.load(meta["storage_path"])
    except storage.StorageError:
        raise HTTPException(status_code=503, detail="File storage is temporarily unavailable. Please try again later.")
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", meta["original_filename"])
    return Response(content=data, media_type=meta["content_type"], headers={
        "Content-Disposition": f'inline; filename="{safe}"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    })
