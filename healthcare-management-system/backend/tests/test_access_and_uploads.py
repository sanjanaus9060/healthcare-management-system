from tests.conftest import auth, future_date

PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def _upload(client, user, content=PDF, name="report.pdf", ctype="application/pdf", patient_id=None, title="Blood test"):
    data = {"title": title}
    if patient_id:
        data["patient_id"] = patient_id
    return client.post("/api/records/upload", headers=auth(user["token"]), data=data, files={"file": (name, content, ctype)})


def _book(client, patient, doctor, time="10:00"):
    return client.post("/api/appointments", headers=auth(patient["token"]), json={
        "doctor_id": doctor["user"]["id"], "date": future_date(4), "time": time, "reason": "Checkup"})


def test_patient_grant_and_revoke_access(client, make_patient, make_doctor):
    p, d = make_patient(), make_doctor()
    pid, did = p["user"]["id"], d["user"]["id"]
    url = f"/api/records/patient/{pid}"
    assert client.get(url, headers=auth(d["token"])).status_code == 403

    r = client.put(f"/api/access/me/{did}", headers=auth(p["token"]), json={"allowed": True})
    assert r.status_code == 200 and r.json()["has_access"] is True and r.json()["override"] == "granted"
    assert client.get(url, headers=auth(d["token"])).status_code == 200
    assert any(x["patient_user_id"] == pid for x in client.get("/api/doctors/me/patients", headers=auth(d["token"])).json())

    client.put(f"/api/access/me/{did}", headers=auth(p["token"]), json={"allowed": False})
    assert client.get(url, headers=auth(d["token"])).status_code == 403


def test_revoke_overrides_appointment_access(client, make_patient, make_doctor):
    p, d = make_patient(), make_doctor()
    _book(client, p, d)
    entry = next(x for x in client.get("/api/access/me", headers=auth(p["token"])).json() if x["id"] == d["user"]["id"])
    assert entry["via_appointment"] and entry["has_access"]
    client.put(f"/api/access/me/{d['user']['id']}", headers=auth(p["token"]), json={"allowed": False})
    assert client.get(f"/api/records/patient/{p['user']['id']}", headers=auth(d["token"])).status_code == 403
    assert all(x["patient_user_id"] != p["user"]["id"] for x in client.get("/api/doctors/me/patients", headers=auth(d["token"])).json())


def test_access_endpoints_role_checks(client, make_patient, make_doctor):
    p, d = make_patient(), make_doctor()
    assert client.get("/api/access/me", headers=auth(d["token"])).status_code == 403
    assert client.put("/api/access/me/not-a-doctor", headers=auth(p["token"]), json={"allowed": True}).status_code == 404


def test_patient_upload_and_download(client, make_patient):
    p, other = make_patient(), make_patient()
    r = _upload(client, p)
    assert r.status_code == 201, r.text
    doc = r.json()["document"]
    assert doc["file_type"] == "PDF" and doc["file_name"] == "report.pdf"
    dl = client.get(f"/api/records/files/{doc['file_id']}", headers=auth(p["token"]))
    assert dl.status_code == 200 and dl.content == PDF and dl.headers["content-type"] == "application/pdf"
    assert client.get(f"/api/records/files/{doc['file_id']}", headers=auth(other["token"])).status_code == 403
    assert any(rec["document"] and rec["document"].get("file_id") == doc["file_id"] for rec in client.get("/api/records/me", headers=auth(p["token"])).json()["records"])


def test_upload_validation(client, make_patient):
    p = make_patient()
    assert _upload(client, p, content=b"just text", name="notes.txt", ctype="text/plain").status_code == 415
    assert _upload(client, p, content=b"%PDF fake", name="evil.pdf", title="x").status_code == 422
    assert _upload(client, p, content=b"", name="empty.pdf").status_code == 422
    assert _upload(client, p, content=b"%PDF" + b"0" * (10 * 1024 * 1024), name="big.pdf").status_code == 413
    assert _upload(client, p, content=PNG, name="scan.png", ctype="image/png").json()["document"]["file_type"] == "PNG"


def test_doctor_file_access_follows_authorization(client, make_patient, make_doctor):
    p, d, stranger = make_patient(), make_doctor(), make_doctor()
    file_id = _upload(client, p).json()["document"]["file_id"]
    url = f"/api/records/files/{file_id}"
    assert client.get(url, headers=auth(d["token"])).status_code == 403
    assert _upload(client, d, patient_id=p["user"]["id"]).status_code == 403
    _book(client, p, d, "11:00")
    assert client.get(url, headers=auth(d["token"])).status_code == 200
    assert _upload(client, d, content=PNG, name="xray.png", ctype="image/png", patient_id=p["user"]["id"], title="X-ray").status_code == 201
    assert client.get(url, headers=auth(stranger["token"])).status_code == 403
