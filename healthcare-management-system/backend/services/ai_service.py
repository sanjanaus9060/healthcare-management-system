"""Provider-agnostic AI assistant service. Configure with AI_PROVIDER, AI_MODEL and AI_API_KEY."""
import os
from typing import AsyncIterator

from core.utils import new_id

SYSTEM_PROMPT = (
    "You are CareBridge Assistant, a health education assistant inside a hospital patient portal. "
    "Explain health topics and medical terminology in simple, friendly language and help users prepare for appointments. "
    "Rules: never diagnose diseases, never prescribe or recommend specific medicine doses, never claim to be a doctor. "
    "If symptoms could be urgent (chest pain, breathing difficulty, stroke signs, severe bleeding, suicidal thoughts), "
    "tell the user to contact local emergency services immediately. "
    "Keep answers concise (under 250 words), use short paragraphs or bullet points, and end with a reminder to consult "
    "a qualified healthcare professional for personal medical advice."
)

EMERGENCY_TERMS = [
    "chest pain", "can't breathe", "cannot breathe", "difficulty breathing", "shortness of breath",
    "heart attack", "stroke", "unconscious", "fainted", "severe bleeding", "seizure", "overdose",
    "suicide", "suicidal", "kill myself", "end my life", "poisoning",
]

EMERGENCY_NOTICE = (
    "**Possible emergency:** Your message mentions symptoms that may need urgent care. "
    "Please call your local emergency number (for example 112 or 911) or go to the nearest emergency department now.\n\n"
)

DEMO_NOTICE = (
    "**Demo mode** - no AI provider key is configured, so this is a pre-written educational message, "
    "not an AI-generated answer.\n\n"
)


class AIServiceError(Exception):
    pass


def get_config() -> dict:
    provider = os.environ.get("AI_PROVIDER", "demo").strip().lower()
    model = os.environ.get("AI_MODEL", "").strip()
    key = (os.environ.get("AI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY") or "").strip()
    live = provider != "demo" and bool(key) and bool(model)
    return {"mode": "live" if live else "demo", "provider": provider if live else "demo", "model": model if live else None, "key": key}


def public_status() -> dict:
    cfg = get_config()
    return {"mode": cfg["mode"], "provider": cfg["provider"], "model": cfg["model"]}


def is_emergency(text: str) -> bool:
    lower = text.lower()
    return any(term in lower for term in EMERGENCY_TERMS)


def _demo_answer(message: str) -> str:
    lower = message.lower()
    if any(w in lower for w in ["prepare", "appointment", "visit", "checkup"]):
        body = (
            "Preparing for an appointment:\n"
            "- Write down your symptoms, when they started and what makes them better or worse.\n"
            "- Bring a list of current medicines, allergies and past test reports.\n"
            "- Note 2-3 questions you want to ask the doctor.\n"
            "- Arrive 10-15 minutes early and carry your digital health card ID."
        )
    elif any(w in lower for w in ["mean", "what is", "term", "explain"]):
        body = (
            "Understanding medical terms: many words combine a root with a suffix. For example, '-itis' means "
            "inflammation (arthritis = joint inflammation), '-algia' means pain, and 'hyper-' / 'hypo-' mean high / low "
            "(hypertension = high blood pressure)."
        )
    else:
        body = (
            "General wellness tips: stay hydrated, aim for 7-9 hours of sleep, include fruits and vegetables in meals, "
            "stay physically active for about 30 minutes a day, and keep regular check-ups."
        )
    return DEMO_NOTICE + body + "\n\nThis is general health education and not a substitute for professional medical advice."


def _build_prompt(message: str, history: list) -> str:
    if not history:
        return message
    lines = [f"{'User' if h['role'] == 'user' else 'Assistant'}: {h['content']}" for h in history[-8:]]
    return "Previous conversation:\n" + "\n".join(lines) + f"\n\nCurrent question: {message}"


async def _provider_stream(prompt: str, cfg: dict) -> AsyncIterator[str]:
    try:
        from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage
    except ImportError as exc:
        raise AIServiceError("AI provider library is not installed") from exc
    chat = LlmChat(api_key=cfg["key"], session_id=new_id(), system_message=SYSTEM_PROMPT).with_model(cfg["provider"], cfg["model"])
    async for event in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(event, TextDelta):
            yield event.content
        elif isinstance(event, StreamDone):
            break


async def stream_reply(message: str, history: list, cfg: dict, emergency: bool) -> AsyncIterator[str]:
    if emergency:
        yield EMERGENCY_NOTICE
    if cfg["mode"] == "demo":
        text = _demo_answer(message)
        for i in range(0, len(text), 40):
            yield text[i:i + 40]
        return
    try:
        async for chunk in _provider_stream(_build_prompt(message, history), cfg):
            yield chunk
    except AIServiceError:
        raise
    except Exception as exc:
        raise AIServiceError("AI provider request failed") from exc
