import json
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from core.database import db
from core.security import get_current_user
from core.utils import new_id, now_iso
from models import ChatIn
from services import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI assistant"])
logger = logging.getLogger("ai")


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


@router.get("/status")
async def status(user: dict = Depends(get_current_user)):
    return ai_service.public_status()


@router.get("/history")
async def history(user: dict = Depends(get_current_user)):
    msgs = await db.ai_messages.find({"user_id": user["id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(50)
    return list(reversed(msgs))


@router.delete("/history")
async def clear_history(user: dict = Depends(get_current_user)):
    await db.ai_messages.delete_many({"user_id": user["id"]})
    return {"message": "Conversation cleared"}


@router.post("/chat")
async def chat(body: ChatIn, user: dict = Depends(get_current_user)):
    past = await db.ai_messages.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(8)
    past.reverse()
    cfg = ai_service.get_config()
    emergency = ai_service.is_emergency(body.message)
    await db.ai_messages.insert_one({"id": new_id(), "user_id": user["id"], "role": "user", "content": body.message, "created_at": now_iso()})

    async def events():
        yield _sse({"type": "meta", "mode": cfg["mode"], "emergency": emergency})
        parts = []
        try:
            async for chunk in ai_service.stream_reply(body.message, past, cfg, emergency):
                parts.append(chunk)
                yield _sse({"type": "delta", "content": chunk})
        except ai_service.AIServiceError as exc:
            logger.warning("AI service error: %s", exc)
            yield _sse({"type": "error", "message": "The AI assistant is temporarily unavailable. Please try again later."})
            return
        content = "".join(parts).strip()
        if not content:
            yield _sse({"type": "error", "message": "The AI assistant returned an empty response. Please try again."})
            return
        await db.ai_messages.insert_one({
            "id": new_id(), "user_id": user["id"], "role": "assistant", "content": content,
            "mode": cfg["mode"], "created_at": now_iso(),
        })
        yield _sse({"type": "done"})

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
