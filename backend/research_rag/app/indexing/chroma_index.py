from __future__ import annotations

import threading
from typing import Any, Dict, List, Optional

from ..core.llm_factory import collection_name, get_embeddings
from ..core.retry_utils import APIRateLimitError, APIServerError, APITimeoutError, retry_api_call
from ..core.settings import settings
from ..models.chunk import Chunk

# Gemini's embedding endpoint accepts at most 100 texts per request.
EMBED_BATCH = 64


def _classify(exc: Exception) -> Exception:
    msg = str(exc).lower()
    if "timeout" in msg:
        return APITimeoutError(str(exc))
    if "429" in msg or "rate" in msg or "quota" in msg:
        return APIRateLimitError(str(exc))
    if any(x in msg for x in ["500", "502", "503", "504", "server error", "unavailable"]):
        return APIServerError(str(exc))
    return exc


def build_where(filters: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Converts {"paper_id": [..], "chunk_level": "paragraph", "year": {"$gte": 2020}}
    into Chroma's syntax, which needs an explicit $and for more than one condition.
    """
    if not filters:
        return None
    clauses: List[Dict[str, Any]] = []
    for key, val in filters.items():
        if val is None:
            continue
        if isinstance(val, list):
            if not val:
                continue
            clauses.append({key: val[0]} if len(val) == 1 else {key: {"$in": list(val)}})
        elif isinstance(val, dict):
            for op, op_val in val.items():
                if op_val is not None:
                    clauses.append({key: {op: op_val}})
        else:
            clauses.append({key: val})
    if not clauses:
        return None
    return clauses[0] if len(clauses) == 1 else {"$and": clauses}


class ChromaIndex:
    def __init__(self):
        self._store = None
        self._lock = threading.Lock()

    @property
    def vector_store(self):
        if self._store is None:
            with self._lock:
                if self._store is None:
                    from langchain_chroma import Chroma

                    self._store = Chroma(
                        persist_directory=settings.CHROMA_DB_PATH,
                        embedding_function=get_embeddings(),
                        collection_name=collection_name(),
                    )
        return self._store

    def count(self) -> int:
        return self.vector_store._collection.count()

    @retry_api_call(max_attempts=4, min_wait=2, max_wait=30)
    def _add_batch(self, texts: List[str], metadatas: List[dict], ids: List[str]):
        try:
            self.vector_store.add_texts(texts=texts, metadatas=metadatas, ids=ids)
        except Exception as exc:
            raise _classify(exc) from exc

    def add_chunks(self, chunks: List[Chunk]):
        for i in range(0, len(chunks), EMBED_BATCH):
            batch = chunks[i : i + EMBED_BATCH]
            self._add_batch([c.text for c in batch], [c.flat_metadata() for c in batch], [c.chunk_id for c in batch])

    def delete_paper(self, paper_id: str) -> None:
        self.vector_store._collection.delete(where={"paper_id": paper_id})

    def paper_chunk_count(self, paper_id: str) -> int:
        res = self.vector_store._collection.get(where={"paper_id": paper_id}, include=[])
        return len(res.get("ids") or [])

    @retry_api_call(max_attempts=4, min_wait=1, max_wait=15)
    def query(self, query: str, k: int = 20, filters: Optional[dict] = None):
        try:
            return self.vector_store.similarity_search_with_score(query, k=k, filter=build_where(filters))
        except Exception as exc:
            raise _classify(exc) from exc
