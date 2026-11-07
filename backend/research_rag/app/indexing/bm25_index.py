from __future__ import annotations

import logging
import os
import pickle
import re
import threading
from typing import List, Optional

from rank_bm25 import BM25Okapi

from ..core.settings import settings
from ..models.chunk import Chunk

logger = logging.getLogger(__name__)

_TOKEN_RE = re.compile(r"\w+", re.UNICODE)


def tokenize(text: str) -> List[str]:
    return _TOKEN_RE.findall(text.lower())


class BM25Index:
    """
    Keyword index over all chunks. Reads and writes are guarded by a lock because
    ingestion runs in worker threads while queries are being answered.
    """

    def __init__(self, path: Optional[str] = None):
        self.path = path or settings.BM25_INDEX_PATH
        self.chunks: List[Chunk] = []
        self.bm25: Optional[BM25Okapi] = None
        self._lock = threading.RLock()
        if os.path.exists(self.path):
            try:
                self.load()
            except Exception as exc:  # corrupt or from an incompatible version
                logger.error("Could not load BM25 index (%s); starting empty.", exc)
                self.chunks, self.bm25 = [], None

    def _rebuild(self) -> None:
        self.bm25 = BM25Okapi([tokenize(c.text) for c in self.chunks]) if self.chunks else None

    def add_chunks(self, chunks: List[Chunk]):
        with self._lock:
            self.chunks = self.chunks + list(chunks)
            self._rebuild()
            self.save()

    def delete_paper(self, paper_id: str) -> int:
        with self._lock:
            before = len(self.chunks)
            self.chunks = [c for c in self.chunks if c.paper_id != paper_id]
            removed = before - len(self.chunks)
            if removed:
                self._rebuild()
                self.save()
            return removed

    def update_paper_metadata(self, paper_id: str, title=None, authors=None, year=None) -> None:
        with self._lock:
            changed = False
            for c in self.chunks:
                if c.paper_id != paper_id:
                    continue
                if title:
                    c.title = title
                if authors is not None:
                    c.authors = list(authors)
                if year:
                    c.year = year
                changed = True
            if changed:
                self.save()

    def chunks_for_paper(self, paper_id: str) -> List[Chunk]:
        with self._lock:
            return [c for c in self.chunks if c.paper_id == paper_id]

    def paper_ids(self) -> List[str]:
        with self._lock:
            return sorted({c.paper_id for c in self.chunks})

    def query(self, query: str, k: int = 20, filters: Optional[dict] = None):
        with self._lock:
            if not self.bm25 or not self.chunks:
                return []
            doc_scores = self.bm25.get_scores(tokenize(query))
            chunks = self.chunks

        candidate_indices = list(range(len(chunks)))
        if filters:
            for key, val in filters.items():
                if val is None:
                    continue
                if key == "paper_id":
                    allowed = {val} if isinstance(val, str) else set(val)
                    candidate_indices = [i for i in candidate_indices if chunks[i].paper_id in allowed]
                elif key == "year":
                    if isinstance(val, dict):
                        for op, op_val in val.items():
                            if op_val is None:
                                continue
                            cmp = {"$gte": lambda a, b: a >= b, "$lte": lambda a, b: a <= b,
                                   "$gt": lambda a, b: a > b, "$lt": lambda a, b: a < b}.get(op)
                            if cmp:
                                candidate_indices = [i for i in candidate_indices if chunks[i].year is not None and cmp(chunks[i].year, op_val)]
                    else:
                        candidate_indices = [i for i in candidate_indices if chunks[i].year == val]
                elif key == "chunk_level":
                    levels = set(val) if isinstance(val, list) else {val}
                    candidate_indices = [i for i in candidate_indices if chunks[i].chunk_level in levels]

        top = sorted(candidate_indices, key=lambda i: doc_scores[i], reverse=True)[:k]
        return [(chunks[i], doc_scores[i]) for i in top]

    def save(self):
        os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
        tmp = self.path + ".tmp"
        with open(tmp, "wb") as f:
            pickle.dump((self.chunks, None), f)
        os.replace(tmp, self.path)

    def load(self):
        with open(self.path, "rb") as f:
            self.chunks, _ = pickle.load(f)
        self._rebuild()
