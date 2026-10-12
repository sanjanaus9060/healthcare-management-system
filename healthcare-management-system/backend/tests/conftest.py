import os
import tempfile
import uuid
from datetime import date, timedelta

os.environ.update({
    "TESTING": "1",
    "DB_NAME": "pytest_healthcare",
    "MONGO_URL": "mongodb://unused-in-tests",
    "JWT_SECRET": "test-secret-not-for-production-0123456789abcdef",
    "ADMIN_EMAIL": "admin@test.local",
    "ADMIN_PASSWORD": "AdminPass123",
    "SEED_DEMO_DATA": "false",
    "CORS_ORIGINS": "http://localhost:3000",
    "AI_PROVIDER": "demo",
    "AI_MODEL": "",
    "AI_API_KEY": "",
    "EMERGENT_LLM_KEY": "",
    "APP_TIMEZONE": "UTC",
    "STORAGE_PROVIDER": "local",
    "UPLOAD_DIR": tempfile.mkdtemp(prefix="carebridge_uploads_"),
})

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from server import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def admin_token(client):
    r = client.post("/api/auth/login", json={"email": "admin@test.local", "password": "AdminPass123"})
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture
def make_patient(client):
    def _make():
        email = f"TEST_patient_{uuid.uuid4().hex[:8]}@test.local"
        r = client.post("/api/auth/register", json={"name": "Test Patient", "email": email, "password": "Patient123"})
        assert r.status_code == 201, r.text
        return r.json()
    return _make


@pytest.fixture
def make_doctor(client, admin_token):
    def _make():
        email = f"TEST_doctor_{uuid.uuid4().hex[:8]}@test.local"
        r = client.post("/api/admin/doctors", headers=auth(admin_token), json={
            "name": "Dr. Test", "email": email, "password": "Doctor123", "specialization": "General Medicine",
            "available_days": [0, 1, 2, 3, 4, 5, 6],
        })
        assert r.status_code == 201, r.text
        login = client.post("/api/auth/login", json={"email": email, "password": "Doctor123"})
        return login.json()
    return _make


def future_date(days=3):
    return (date.today() + timedelta(days=days)).isoformat()
