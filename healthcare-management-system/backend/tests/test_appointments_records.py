from tests.conftest import auth, future_date


def _book(client, patient, doctor, time="10:00", days=3):
    return client.post("/api/appointments", headers=auth(patient["token"]), json={
        "doctor_id": doctor["user"]["id"], "date": future_date(days), "time": time, "reason": "Routine checkup",
    })


def test_booking_and_duplicate_prevention(client, make_patient, make_doctor):
    d = make_doctor()
    p1, p2 = make_patient(), make_patient()
    r = _book(client, p1, d)
    assert r.status_code == 201 and r.json()["status"] == "pending"
    dup = _book(client, p2, d)
    assert dup.status_code == 409
    slots = client.get(f"/api/doctors/{d['user']['id']}/slots", params={"date": future_date(3)}, headers=auth(p2["token"])).json()
    assert any(s["time"] == "10:00" and not s["available"] for s in slots)


def test_cancel_frees_slot(client, make_patient, make_doctor):
    d = make_doctor()
    p1, p2 = make_patient(), make_patient()
    appt = _book(client, p1, d, "11:00").json()
    assert client.patch(f"/api/appointments/{appt['id']}/cancel", headers=auth(p2["token"])).status_code == 403
    assert client.patch(f"/api/appointments/{appt['id']}/cancel", headers=auth(p1["token"])).status_code == 200
    assert _book(client, p2, d, "11:00").status_code == 201


def test_date_and_time_validation(client, make_patient, make_doctor):
    d, p = make_doctor(), make_patient()
    past = client.post("/api/appointments", headers=auth(p["token"]), json={
        "doctor_id": d["user"]["id"], "date": "2020-01-01", "time": "10:00", "reason": "Old date"})
    assert past.status_code == 422
    assert _book(client, p, d, "03:17").status_code == 422
    assert _book(client, p, d, "25:00").status_code == 422


def test_doctor_cannot_book(client, make_doctor):
    d = make_doctor()
    assert _book(client, d, d).status_code == 403


def test_status_transitions(client, make_patient, make_doctor):
    d, other, p = make_doctor(), make_doctor(), make_patient()
    appt = _book(client, p, d, "14:00").json()
    url = f"/api/appointments/{appt['id']}/status"
    assert client.patch(url, headers=auth(other["token"]), json={"status": "confirmed"}).status_code == 403
    assert client.patch(url, headers=auth(p["token"]), json={"status": "confirmed"}).status_code == 403
    assert client.patch(url, headers=auth(d["token"]), json={"status": "completed"}).status_code == 400
    assert client.patch(url, headers=auth(d["token"]), json={"status": "confirmed"}).json()["status"] == "confirmed"
    assert client.patch(url, headers=auth(d["token"]), json={"status": "completed"}).json()["status"] == "completed"


def test_record_access_permissions(client, make_patient, make_doctor):
    d, stranger, p = make_doctor(), make_doctor(), make_patient()
    pid = p["user"]["id"]
    assert client.get(f"/api/records/patient/{pid}", headers=auth(d["token"])).status_code == 403
    _book(client, p, d, "15:00")
    assert client.get(f"/api/records/patient/{pid}", headers=auth(d["token"])).status_code == 200
    assert client.get(f"/api/records/patient/{pid}", headers=auth(stranger["token"])).status_code == 403

    rec = client.post("/api/records", headers=auth(d["token"]), json={
        "patient_id": pid, "record_type": "prescription", "title": "Cold treatment",
        "medications": [{"name": "Paracetamol", "dosage": "500 mg", "frequency": "Twice daily", "duration": "3 days"}]})
    assert rec.status_code == 201
    assert client.post("/api/records", headers=auth(stranger["token"]), json={
        "patient_id": pid, "record_type": "consultation", "title": "Not allowed"}).status_code == 403

    mine = client.get("/api/records/me", headers=auth(p["token"])).json()
    assert any(r["title"] == "Cold treatment" for r in mine["records"])
    assert client.post("/api/records", headers=auth(p["token"]), json={"record_type": "diagnosis", "title": "Self diagnosis"}).status_code == 403
    doc = client.post("/api/records", headers=auth(p["token"]), json={
        "record_type": "document", "title": "Blood test", "document": {"file_name": "cbc.pdf", "file_type": "PDF"}})
    assert doc.status_code == 201


def test_admin_cannot_read_medical_records(client, admin_token, make_patient):
    p = make_patient()
    assert client.get(f"/api/records/patient/{p['user']['id']}", headers=auth(admin_token)).status_code == 403
