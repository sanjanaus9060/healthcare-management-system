import json

from services import ai_service
from tests.conftest import auth


def _events(text):
    return [json.loads(line[6:]) for line in text.splitlines() if line.startswith("data: ")]


def test_ai_requires_auth(client):
    assert client.post("/api/ai/chat", json={"message": "hi"}).status_code == 401


def test_ai_validation(client, make_patient):
    h = auth(make_patient()["token"])
    assert client.post("/api/ai/chat", headers=h, json={"message": "   "}).status_code == 422
    assert client.post("/api/ai/chat", headers=h, json={"message": "x" * 2001}).status_code == 422


def test_ai_demo_mode_without_key(client, make_patient):
    h = auth(make_patient()["token"])
    assert client.get("/api/ai/status", headers=h).json()["mode"] == "demo"
    r = client.post("/api/ai/chat", headers=h, json={"message": "How do I prepare for my appointment?"})
    events = _events(r.text)
    assert events[0] == {"type": "meta", "mode": "demo", "emergency": False}
    text = "".join(e["content"] for e in events if e["type"] == "delta")
    assert "Demo mode" in text and "not a substitute" in text
    assert events[-1]["type"] == "done"
    assert len(client.get("/api/ai/history", headers=h).json()) == 2


def test_ai_emergency_notice(client, make_patient):
    h = auth(make_patient()["token"])
    events = _events(client.post("/api/ai/chat", headers=h, json={"message": "I have severe chest pain"}).text)
    assert events[0]["emergency"] is True
    assert "emergency" in "".join(e.get("content", "") for e in events).lower()


def test_ai_provider_error_handled(client, make_patient, monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "anthropic")
    monkeypatch.setenv("AI_MODEL", "some-model")
    monkeypatch.setenv("AI_API_KEY", "fake-key")

    async def broken(prompt, cfg):
        raise RuntimeError("upstream failure")
        yield ""

    monkeypatch.setattr(ai_service, "_provider_stream", broken)
    h = auth(make_patient()["token"])
    r = client.post("/api/ai/chat", headers=h, json={"message": "What is hypertension?"})
    events = _events(r.text)
    assert events[0]["mode"] == "live"
    assert events[-1]["type"] == "error"
    assert "upstream" not in r.text
