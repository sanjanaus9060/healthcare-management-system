from tests.conftest import auth


def test_patient_cannot_access_admin(client, make_patient):
    p = make_patient()
    assert client.get("/api/admin/stats", headers=auth(p["token"])).status_code == 403
    assert client.get("/api/admin/users", headers=auth(p["token"])).status_code == 403


def test_doctor_cannot_access_admin_or_patient_card(client, make_doctor):
    d = make_doctor()
    assert client.get("/api/admin/stats", headers=auth(d["token"])).status_code == 403
    assert client.get("/api/health-card/me", headers=auth(d["token"])).status_code == 403


def test_admin_stats_and_users_hide_passwords(client, admin_token, make_patient):
    make_patient()
    r = client.get("/api/admin/stats", headers=auth(admin_token))
    assert r.status_code == 200 and r.json()["patients"] >= 1
    users = client.get("/api/admin/users", headers=auth(admin_token)).json()
    assert all("password_hash" not in u for u in users)


def test_disabled_user_cannot_login(client, admin_token, make_patient):
    p = make_patient()
    client.patch(f"/api/admin/users/{p['user']['id']}", headers=auth(admin_token), json={"is_active": False})
    r = client.post("/api/auth/login", json={"email": p["user"]["email"], "password": "Patient123"})
    assert r.status_code == 403


def test_health_card_get_update(client, make_patient):
    p = make_patient()
    h = auth(p["token"])
    card = client.get("/api/health-card/me", headers=h)
    assert card.status_code == 200
    assert card.json()["patient_id"] == p["user"]["patient_id"]
    r = client.put("/api/health-card/me", headers=h, json={
        "blood_group": "O+", "date_of_birth": "1990-01-15", "allergies": ["Penicillin", " penicillin ", "Dust"],
        "emergency_contact": {"name": "Jane Doe", "relation": "Mother", "phone": "+91 98765 43210"},
    })
    assert r.status_code == 200
    assert r.json()["blood_group"] == "O+"
    assert r.json()["allergies"] == ["Penicillin", "Dust"]


def test_health_card_validation(client, make_patient):
    h = auth(make_patient()["token"])
    assert client.put("/api/health-card/me", headers=h, json={"blood_group": "Z+"}).status_code == 422
    assert client.put("/api/health-card/me", headers=h, json={"date_of_birth": "2999-01-01"}).status_code == 422


def test_qr_verify_is_non_sensitive_and_revocable(client, make_patient):
    p = make_patient()
    h = auth(p["token"])
    client.put("/api/health-card/me", headers=h, json={"allergies": ["Latex"], "blood_group": "A+"})
    token = client.get("/api/health-card/me", headers=h).json()["qr_token"]
    v = client.get(f"/api/health-card/verify/{token}")
    assert v.status_code == 200
    data = v.json()
    assert "allergies" not in data and "blood_group" not in data and "email" not in data
    client.post("/api/health-card/me/regenerate-qr", headers=h)
    assert client.get(f"/api/health-card/verify/{token}").status_code == 404
