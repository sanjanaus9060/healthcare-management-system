"""Pluggable file storage. STORAGE_PROVIDER=emergent uses Emergent object storage; 'local' writes to UPLOAD_DIR."""
import logging
import os
from pathlib import Path

import requests
from fastapi.concurrency import run_in_threadpool

logger = logging.getLogger("storage")
APP_PREFIX = "carebridge"
_storage_key = None


class StorageError(Exception):
    pass


def _provider() -> str:
    return os.environ.get("STORAGE_PROVIDER", "local").strip().lower()


def _local_root() -> Path:
    return Path(os.environ.get("UPLOAD_DIR") or Path(__file__).resolve().parent.parent / "uploads")


def _storage_url() -> str:
    base = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
    return base.rstrip("/") + "/objstore/api/v1/storage"


def _init(force: bool = False) -> str:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{_storage_url()}/init", json={"emergent_key": os.environ["EMERGENT_LLM_KEY"]}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _request(method: str, path: str, headers: dict | None = None, **kwargs) -> requests.Response:
    url = f"{_storage_url()}/objects/{path}"
    resp = requests.request(method, url, headers={"X-Storage-Key": _init(), **(headers or {})}, **kwargs)
    if resp.status_code == 404 and method == "PUT":
        resp = requests.request(method, url, headers={"X-Storage-Key": _init(force=True), **(headers or {})}, **kwargs)
    resp.raise_for_status()
    return resp


def _put_emergent(path: str, data: bytes, content_type: str) -> str:
    return _request("PUT", path, data=data, headers={"Content-Type": content_type}, timeout=120).json()["path"]


def _get_emergent(path: str) -> bytes:
    return _request("GET", path, timeout=60).content


def _put_local(path: str, data: bytes) -> str:
    target = _local_root() / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return path


def _get_local(path: str) -> bytes:
    return (_local_root() / path).read_bytes()


async def save(path: str, data: bytes, content_type: str) -> str:
    try:
        if _provider() == "emergent":
            return await run_in_threadpool(_put_emergent, path, data, content_type)
        return await run_in_threadpool(_put_local, path, data)
    except Exception as exc:
        logger.warning("Storage upload failed: %s", type(exc).__name__)
        raise StorageError("upload failed") from exc


async def load(path: str) -> bytes:
    try:
        if _provider() == "emergent":
            return await run_in_threadpool(_get_emergent, path)
        return await run_in_threadpool(_get_local, path)
    except Exception as exc:
        logger.warning("Storage download failed: %s", type(exc).__name__)
        raise StorageError("download failed") from exc


async def init_at_startup():
    if _provider() != "emergent":
        return
    try:
        await run_in_threadpool(_init)
        logger.info("Object storage initialized")
    except Exception as exc:
        logger.error("Object storage init failed: %s", type(exc).__name__)
