import hmac
import logging

from fastapi import Header, HTTPException

from ..core.settings import settings

logger = logging.getLogger(__name__)

if not settings.RAG_API_KEY:
    logger.warning("RAG_API_KEY is not set: the API is open to anyone who can reach it. Set it in production.")


async def require_api_key(x_api_key: str = Header(default="")) -> None:
    expected = settings.RAG_API_KEY
    if not expected:
        return
    if not x_api_key or not hmac.compare_digest(x_api_key.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key.")
