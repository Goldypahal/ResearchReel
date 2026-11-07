"""
Multi-paper research tools. Every endpoint works only on the paper IDs the caller
passes, so a caller can never reach papers it did not select.
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core.indexes import bm25, graph
from ..services.contradiction_detector import ContradictionDetector
from ..services.gap_finder import ResearchGapFinder
from ..services.literature_reviewer import LiteratureReviewer
from ..services.paper_comparator import PaperComparator
from ..services.timeline_generator import ResearchTimelineGenerator
from .validation import check_paper_ids

router = APIRouter()

_services = {}


def _svc(name: str):
    if name not in _services:
        _services[name] = {
            "compare": lambda: PaperComparator(bm25=bm25),
            "review": lambda: LiteratureReviewer(bm25=bm25),
            "contradictions": lambda: ContradictionDetector(bm25=bm25),
            "gaps": lambda: ResearchGapFinder(),
            "timeline": lambda: ResearchTimelineGenerator(),
        }[name]()
    return _services[name]


class IntelRequest(BaseModel):
    paper_ids: List[str]


def _indexed(paper_ids: List[str], minimum: int) -> List[str]:
    ids = check_paper_ids(paper_ids, minimum=minimum, maximum=20)
    known = set(bm25.paper_ids())
    ready = [p for p in ids if p in known]
    if len(ready) < minimum:
        raise HTTPException(status_code=409, detail="Some selected papers have not been indexed yet.")
    return ready


def _result(text: str) -> str:
    if not text or text.startswith("Failed to"):
        raise HTTPException(status_code=502, detail="The language model is unavailable; try again shortly.")
    return text.strip()


@router.post("/compare")
def compare(request: IntelRequest):
    ids = _indexed(request.paper_ids, 2)
    return {"result": _result(_svc("compare").compare_papers(ids)), "paper_ids": ids}


@router.post("/review")
def review(request: IntelRequest):
    ids = _indexed(request.paper_ids, 1)
    return {"result": _result(_svc("review").generate_review(ids)), "paper_ids": ids}


@router.post("/contradictions")
def contradictions(request: IntelRequest):
    ids = _indexed(request.paper_ids, 2)
    return {"result": _result(_svc("contradictions").detect_contradictions(ids)), "paper_ids": ids}


@router.post("/gaps")
def gaps(request: IntelRequest):
    ids = _indexed(request.paper_ids, 1)
    comparator = _svc("compare")
    extra = "\n\n".join(comparator._get_paper_facts_from_chunks(pid, max_chars=3000) for pid in ids)
    return {"result": _result(_svc("gaps").find_gaps(ids, extra_facts=extra)), "paper_ids": ids}


@router.post("/timeline")
def timeline(request: IntelRequest):
    ids = _indexed(request.paper_ids, 1)
    text = _svc("timeline").generate_timeline(ids)
    if text.startswith("None of the selected papers"):
        raise HTTPException(status_code=409, detail=text)
    return {"result": _result(text), "paper_ids": ids}


@router.post("/graph")
def knowledge_graph(request: IntelRequest):
    import sqlite3

    ids = check_paper_ids(request.paper_ids, minimum=1, maximum=20)
    placeholders = ",".join("?" for _ in ids)
    with sqlite3.connect(graph.db_path) as conn:
        conn.row_factory = sqlite3.Row
        nodes = [
            {"id": r["entity_id"], "label": r["name"], "type": r["type"], "paper_id": r["paper_id"]}
            for r in conn.execute(f"SELECT entity_id, name, type, paper_id FROM entities WHERE paper_id IN ({placeholders})", ids)
        ]
        edges = [
            {"source": r["source_id"], "target": r["target_id"], "label": r["relation_type"], "description": r["description"] or ""}
            for r in conn.execute(
                f"""SELECT r.source_id, r.target_id, r.relation_type, r.description
                      FROM relations r
                      JOIN entities e1 ON r.source_id = e1.entity_id
                      JOIN entities e2 ON r.target_id = e2.entity_id
                     WHERE e1.paper_id IN ({placeholders}) AND e2.paper_id IN ({placeholders})""",
                ids + ids,
            )
        ]
    return {"nodes": nodes, "edges": edges}
