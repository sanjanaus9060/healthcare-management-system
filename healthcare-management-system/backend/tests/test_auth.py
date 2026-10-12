from tests.conftest import auth


def test_register_and_login(client):
    r = client.post("/api/auth/register", json={"name": "Alice Test", "email": "TEST_alice@test.local", "password": "Secret123"})
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["role"] == "patient"
    assert "password_hash" not in body["user"]
    assert body["user"]["patient_id"].startswith("HC")

    login = client.post("/api/auth/login", json={"email": "test_alice@test.local", "password": "Secret123"})
    assert login.status_code == 200
    me = client.get("/api/auth/me", headers=auth(login.json()["token"]))
    assert me.status_code == 200 and me.json()["email"] == "test_alice@test.local"


def test_duplicate_registration(client):
    payload = {"name": "Bob Test", "email": "TEST_bob@test.local", "password": "Secret123"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    assert client.post("/api/auth/register", json=payload).status_code == 409


def test_register_validation(client):
    assert client.post("/api/auth/register", json={"name": "X", "email": "bad", "password": "short"}).status_code == 422
    assert client.post("/api/auth/register", json={"name": "Weak Pw", "email": "TEST_w@test.local", "password": "onlyletters"}).status_code == 422


def test_invalid_credentials(client):
    client.post("/api/auth/register", json={"name": "Carol Test", "email": "TEST_carol@test.local", "password": "Secret123"})
    r = client.post("/api/auth/login", json={"email": "TEST_carol@test.local", "password": "WrongPass1"})
    assert r.status_code == 401
    assert client.post("/api/auth/login", json={"email": "nobody@test.local", "password": "Whatever1"}).status_code == 401


def test_protected_routes_require_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers=auth("not-a-real-token")).status_code == 401


def test_register_cannot_choose_role(client):
    r = client.post("/api/auth/register", json={"name": "Eve Test", "email": "TEST_eve@test.local", "password": "Secret123", "role": "admin"})
    assert r.status_code == 201
    assert r.json()["user"]["role"] == "patient"
