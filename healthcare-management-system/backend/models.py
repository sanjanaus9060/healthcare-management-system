import re
from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

EMAIL_RE = r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$"
PHONE_RE = r"^\+?[0-9][0-9\- ]{6,19}$"
TIME_RE = r"^([01]\d|2[0-3]):[0-5]\d$"
BloodGroup = Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]


def _check_password(value: str) -> str:
    if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        raise ValueError("Password must contain at least one letter and one number")
    return value


def _clean_list(values):
    if values is None:
        return None
    out = []
    for v in values:
        v = v.strip()
        if not v:
            continue
        if len(v) > 60:
            raise ValueError("Each item must be 60 characters or fewer")
        if v.lower() not in [o.lower() for o in out]:
            out.append(v)
    return out


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(pattern=EMAIL_RE, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    phone: Optional[str] = Field(default=None, pattern=PHONE_RE)

    _pw = field_validator("password")(_check_password)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=1, max_length=128)


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    phone: Optional[str] = Field(default=None, pattern=PHONE_RE)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    _pw = field_validator("new_password")(_check_password)


class EmergencyContact(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    relation: str = Field(min_length=2, max_length=40)
    phone: str = Field(pattern=PHONE_RE)


class HealthCardUpdate(BaseModel):
    blood_group: Optional[BloodGroup] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Literal["female", "male", "other", "prefer_not_to_say"]] = None
    phone: Optional[str] = Field(default=None, pattern=PHONE_RE)
    address: Optional[str] = Field(default=None, max_length=200)
    emergency_contact: Optional[EmergencyContact] = None
    allergies: Optional[List[str]] = Field(default=None, max_length=20)
    chronic_conditions: Optional[List[str]] = Field(default=None, max_length=20)

    @field_validator("date_of_birth")
    @classmethod
    def dob_valid(cls, v):
        if v and (v > date.today() or v.year < 1900):
            raise ValueError("Date of birth must be a past date after 1900")
        return v

    _lists = field_validator("allergies", "chronic_conditions")(_clean_list)


class DoctorProfileUpdate(BaseModel):
    specialization: Optional[str] = Field(default=None, min_length=2, max_length=80)
    qualification: Optional[str] = Field(default=None, max_length=120)
    experience_years: Optional[int] = Field(default=None, ge=0, le=60)
    bio: Optional[str] = Field(default=None, max_length=500)
    available_days: Optional[List[int]] = None
    slots: Optional[List[str]] = None

    @field_validator("available_days")
    @classmethod
    def days_valid(cls, v):
        if v is not None:
            if not v or any(d < 0 or d > 6 for d in v):
                raise ValueError("Available days must be values 0 (Mon) to 6 (Sun)")
            return sorted(set(v))
        return v

    @field_validator("slots")
    @classmethod
    def slots_valid(cls, v):
        if v is not None:
            if not v or any(not re.match(TIME_RE, s) for s in v):
                raise ValueError("Slots must be HH:MM times")
            return sorted(set(v))
        return v


class AppointmentCreate(BaseModel):
    doctor_id: str = Field(min_length=1, max_length=64)
    date: date
    time: str = Field(pattern=TIME_RE)
    reason: str = Field(min_length=3, max_length=300)


class StatusUpdate(BaseModel):
    status: Literal["confirmed", "completed", "cancelled"]
    note: Optional[str] = Field(default=None, max_length=500)


class Medication(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    dosage: str = Field(min_length=1, max_length=40)
    frequency: str = Field(min_length=1, max_length=60)
    duration: str = Field(min_length=1, max_length=40)


class DocumentMeta(BaseModel):
    file_name: str = Field(min_length=1, max_length=120)
    file_type: str = Field(min_length=1, max_length=40)
    size_kb: Optional[int] = Field(default=None, ge=0, le=100000)


class RecordCreate(BaseModel):
    patient_id: Optional[str] = Field(default=None, max_length=64)
    record_type: Literal["consultation", "prescription", "diagnosis", "document"]
    title: str = Field(min_length=3, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    diagnosis: Optional[str] = Field(default=None, max_length=300)
    medications: List[Medication] = Field(default_factory=list, max_length=20)
    document: Optional[DocumentMeta] = None
    appointment_id: Optional[str] = Field(default=None, max_length=64)


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)

    @field_validator("message")
    @classmethod
    def not_blank(cls, v):
        if not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()


class AdminDoctorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(pattern=EMAIL_RE, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    phone: Optional[str] = Field(default=None, pattern=PHONE_RE)
    specialization: str = Field(min_length=2, max_length=80)
    qualification: Optional[str] = Field(default=None, max_length=120)
    experience_years: int = Field(default=0, ge=0, le=60)
    available_days: List[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4])

    _pw = field_validator("password")(_check_password)


class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    phone: Optional[str] = Field(default=None, pattern=PHONE_RE)
    specialization: Optional[str] = Field(default=None, min_length=2, max_length=80)
    qualification: Optional[str] = Field(default=None, max_length=120)
    experience_years: Optional[int] = Field(default=None, ge=0, le=60)
