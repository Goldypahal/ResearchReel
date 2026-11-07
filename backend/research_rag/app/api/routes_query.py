from __future__ import annotations

import logging
import threading
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..core.component_factory import build_components
from ..core.indexes import bm25, chroma
from ..core.retry_utils import LLMUnavailableError
from ..retrieval.hybrid_retriever import HybridRetriever
from ..services.query_service import QueryService
from .validation import check_paper_ids

logger = logging.getLogger(__name__)
router = APIRouter()

_service: Optional[QueryService] = None
_service_lock = threading.Lock()


def get_query_service() -> QueryService:
    global _service
    if _service is None:
        with _service_lock:
            if _service is None:
                generator, enforcer, reranker = build_components()
                _service = QueryService(HybridRetriever(chroma, bm25, reranker=reranker), generator, enforcer)
    return _service


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    paper_ids: List[str] = Field(..., description="Papers to search; required so callers control access.")
    expand_context: bool = False


def _chunk_summary(c: dict) -> dict:
    return {
        "chunk_id": c.get("chunk_id"),
        "paper_id": c.get("paper_id"),
        "title": c.get("title"),
        "section": c.get("section"),
        "page_start": c.get("page_start"),
        "page_end": c.get("page_end"),
        "text": (c.get("text") or "")[:600],
    }


@router.post("/query")
def query_papers(request: QueryRequest):
    paper_ids = check_paper_ids(request.paper_ids)
    indexed = set(bm25.paper_ids())
    searchable = [p for p in paper_ids if p in indexed]
    if not searchable:
        raise HTTPException(status_code=409, detail="None of the selected papers has been indexed yet.")

    try:
        result = get_query_service().ask(
            request.query.strip(),
            filters={"paper_id": searchable},
            expand_context=request.expand_context,
        )
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=502, detail="The language model is unavailable; try again shortly.") from exc

    return {
        "answer": result["answer"],
        "citations": result.get("citations", []),
        "chunks": [_chunk_summary(c) for c in result.get("chunks", [])],
        "latency": round(result["latency"], 3),
        "searched_paper_ids": searchable,
        "missing_paper_ids": [p for p in paper_ids if p not in indexed],
    }
