from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import logging  # noqa: E402
import os  # noqa: E402
from contextlib import asynccontextmanager  # noqa: E402

from fastapi import FastAPI  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

from core.database import client, create_indexes  # noqa: E402
from routers import access, admin, ai, appointments, auth, doctors, health_card, records, users  # noqa: E402
from services import storage  # noqa: E402
from seed import seed_admin, seed_demo  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await create_indexes()
    await seed_admin()
    await seed_demo()
    await storage.init_at_startup()
    yield
    client.close()


app = FastAPI(
    title="CareBridge - AI-Powered Integrated Health Card API",
    description="Healthcare management API: auth, health cards, appointments, medical records, AI assistant, admin.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

for module in (auth, users, health_card, doctors, appointments, records, access, ai, admin):
    app.include_router(module.router)


@app.get("/api/health", tags=["System"])
async def health():
    return {"status": "ok"}


origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
