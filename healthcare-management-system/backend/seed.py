"""Idempotent seeding: admin account from env, plus optional synthetic demo data."""
import os
import secrets
from datetime import timedelta

from core.database import db
from core.security import hash_password, verify_password
from core.utils import local_now, new_id, now_iso
from routers.admin import DEFAULT_SLOTS

DEMO_DOCTORS = [
    ("Dr. Ananya Rao", "doctor.rao@carebridge-demo.com", "Cardiology", "MD, DM Cardiology", 12),
    ("Dr. Vikram Mehta", "doctor.mehta@carebridge-demo.com", "General Medicine", "MBBS, MD", 8),
    ("Dr. Sara Thomas", "doctor.thomas@carebridge-demo.com", "Dermatology", "MBBS, DDVL", 6),
    ("Dr. Rohan Iyer", "doctor.iyer@carebridge-demo.com", "Pediatrics", "MBBS, DCH", 10),
]
DEMO_PATIENTS = [
    ("Priya Nair", "patient.priya@carebridge-demo.com", "B+", "1995-04-12", ["Penicillin", "Peanuts"], ["Mild asthma"]),
    ("Arjun Das", "patient.arjun@carebridge-demo.com", "O+", "1988-09-30", ["Dust mites"], ["Type 2 diabetes"]),
]


async def seed_admin():
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "id": new_id(), "email": email, "name": "System Administrator", "phone": None, "role": "admin",
            "password_hash": hash_password(password), "is_active": True, "created_at": now_iso(),
        })
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})


def _next_weekday(start, days_ahead=1):
    d = start + timedelta(days=days_ahead)
    while d.weekday() > 4:
        d += timedelta(days=1)
    return d


async def seed_demo():
    if os.environ.get("SEED_DEMO_DATA", "false").lower() != "true":
        return
    doctor_pw = os.environ.get("DEMO_DOCTOR_PASSWORD")
    patient_pw = os.environ.get("DEMO_PATIENT_PASSWORD")
    if not doctor_pw or not patient_pw or await db.users.find_one({"email": DEMO_DOCTORS[0][1]}):
        return
    doctors = []
    for name, email, spec, qual, exp in DEMO_DOCTORS:
        doc = {
            "id": new_id(), "email": email, "name": name, "phone": "+91 90000 00000", "role": "doctor",
            "specialization": spec, "qualification": qual, "experience_years": exp,
            "bio": f"Synthetic demo profile - {spec} specialist.", "available_days": [0, 1, 2, 3, 4],
            "slots": DEFAULT_SLOTS, "password_hash": hash_password(doctor_pw), "is_active": True, "created_at": now_iso(),
        }
        await db.users.insert_one(doc)
        doctors.append(doc)

    today = local_now().date()
    patients = []
    for i, (name, email, blood, dob, allergies, conditions) in enumerate(DEMO_PATIENTS):
        pid = f"HC{today.year}{secrets.token_hex(3).upper()}"
        user = {
            "id": new_id(), "email": email, "name": name, "phone": f"+91 98000 0000{i}", "role": "patient",
            "patient_id": pid, "password_hash": hash_password(patient_pw), "is_active": True, "created_at": now_iso(),
        }
        await db.users.insert_one(user)
        await db.health_cards.insert_one({
            "patient_user_id": user["id"], "patient_id": pid, "name": name, "email": email, "phone": user["phone"],
            "blood_group": blood, "date_of_birth": dob, "gender": "female" if i == 0 else "male",
            "address": "Synthetic Street, Demo City", "allergies": allergies, "chronic_conditions": conditions,
            "emergency_contact": {"name": "Demo Contact", "relation": "Sibling", "phone": "+91 97000 00000"},
            "qr_token": secrets.token_urlsafe(16), "issued_at": now_iso(), "updated_at": now_iso(),
        })
        patients.append(user)

    def appt(patient, doctor, day, time, status, reason, note=None):
        a = {
            "id": new_id(), "patient_user_id": patient["id"], "patient_name": patient["name"],
            "patient_code": patient["patient_id"], "doctor_user_id": doctor["id"], "doctor_name": doctor["name"],
            "specialization": doctor["specialization"], "date": day.isoformat(), "time": time, "reason": reason,
            "status": status, "doctor_note": note, "created_at": now_iso(), "updated_at": now_iso(),
        }
        if status in ("pending", "confirmed"):
            a["slot_lock"] = f"{doctor['id']}|{a['date']}|{time}"
        return a

    priya, arjun = patients
    past = today - timedelta(days=14)
    upcoming = _next_weekday(today, 2)
    await db.appointments.insert_many([
        appt(priya, doctors[0], past, "10:00", "completed", "Occasional palpitations", "ECG normal. Follow up in 3 months."),
        appt(priya, doctors[0], upcoming, "10:30", "confirmed", "Follow-up consultation"),
        appt(arjun, doctors[1], upcoming, "11:00", "pending", "Routine diabetes review"),
        appt(arjun, doctors[1], past, "09:30", "completed", "Fatigue and frequent thirst"),
    ])
    rao, mehta = doctors[0], doctors[1]

    def rec(patient, author, rtype, title, desc, diagnosis=None, meds=None, document=None):
        return {
            "id": new_id(), "patient_user_id": patient["id"], "author_id": author["id"], "author_name": author["name"],
            "author_role": "doctor", "record_type": rtype, "title": title, "description": desc, "diagnosis": diagnosis,
            "medications": meds or [], "document": document, "appointment_id": None, "created_at": now_iso(),
        }

    await db.medical_records.insert_many([
        rec(priya, rao, "consultation", "Cardiology consultation", "Patient reported occasional palpitations after caffeine. Vitals stable."),
        rec(priya, rao, "diagnosis", "Benign palpitations", "Likely caffeine-related; no structural concern found.", "Benign sinus palpitations"),
        rec(priya, rao, "prescription", "Lifestyle and symptom relief", "Reduce caffeine intake.",
            meds=[{"name": "Magnesium supplement", "dosage": "250 mg", "frequency": "Once daily", "duration": "30 days"}]),
        rec(priya, rao, "document", "ECG report", "Resting 12-lead ECG.", document={"file_name": "ecg_report_demo.pdf", "file_type": "PDF", "size_kb": 320}),
        rec(arjun, mehta, "diagnosis", "Type 2 diabetes review", "HbA1c slightly elevated.", "Type 2 diabetes mellitus"),
        rec(arjun, mehta, "prescription", "Diabetes management", "Continue diet plan; review in 3 months.",
            meds=[{"name": "Metformin", "dosage": "500 mg", "frequency": "Twice daily", "duration": "90 days"}]),
    ])
