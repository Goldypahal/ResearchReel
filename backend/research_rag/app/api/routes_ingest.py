"""
Paper ingestion. ResearchReel sends each uploaded PDF with its own document ID,
so the same paper can be re-indexed (idempotently) or removed later.
"""
from __future__ import annotations

import logging
import os
import threading
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from ..core.indexes import bm25, chroma, graph
from ..core.settings import settings
from ..indexing.chunker import SectionAwareChunker
from ..ingestion.parser_factory import get_parser
from .validation import check_paper_id

logger = logging.getLogger(__name__)
router = APIRouter()

# One ingestion at a time: parsing and embedding are memory-heavy, and it keeps
# delete-then-add for the same paper atomic with respect to other writes.
_ingest_lock = threading.Lock()


def _paper_path(paper_id: str) -> str:
    return os.path.join(settings.PAPERS_DIR, f"{paper_id}.pdf")


def _remove_paper(paper_id: str) -> None:
    chroma.delete_paper(paper_id)
    bm25.delete_paper(paper_id)
    graph.delete_paper(paper_id)


def _extract_entities(paper) -> None:
    try:
        from ..indexing.entity_extractor import EntityExtractor

        EntityExtractor().extract_and_index_paper(paper)
    except Exception as exc:  # never fail ingestion because of the knowledge graph
        logger.error("Entity extraction failed for %s: %s", paper.paper_id, exc)


def _save_upload(file: UploadFile, dest: str) -> int:
    limit = settings.MAX_UPLOAD_MB * 1024 * 1024
    size = 0
    tmp = dest + ".part"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    try:
        with open(tmp, "wb") as out:
            first = True
            while True:
                block = file.file.read(1024 * 1024)
                if not block:
                    break
                if first:
                    if not block.startswith(b"%PDF"):
                        raise HTTPException(status_code=415, detail="Only PDF files can be indexed.")
                    first = False
                size += len(block)
                if size > limit:
                    raise HTTPException(status_code=413, detail=f"PDF is larger than {settings.MAX_UPLOAD_MB} MB.")
                out.write(block)
        if size == 0:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")
        os.replace(tmp, dest)
        return size
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


@router.post("/papers")
def ingest_paper(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    paper_id: str = Form(...),
    title: Optional[str] = Form(None),
    authors: Optional[str] = Form(None),
    year: Optional[int] = Form(None),
    doi: Optional[str] = Form(None),
):
    """Indexes (or re-indexes) one paper under the caller's ID."""
    check_paper_id(paper_id)
    path = _paper_path(paper_id)

    with _ingest_lock:
        _save_upload(file, path)
        try:
            paper = get_parser("pymupdf").parse(path, paper_id)
        except Exception as exc:
            logger.warning("Could not parse %s: %s", paper_id, exc)
            raise HTTPException(status_code=422, detail="The PDF could not be read.") from exc

        # Metadata entered in ResearchReel is more reliable than PDF properties.
        if title:
            paper.title = title.strip()[:500]
        if authors is not None:
            paper.authors = [a.strip() for a in authors.split(",") if a.strip()][:50]
        if year:
            paper.year = year
        elif paper.year and not (1800 <= paper.year <= 2100):
            paper.year = None
        if doi:
            paper.doi = doi.strip()

        chunks = SectionAwareChunker(
            chunk_size_tokens=settings.CHUNK_SIZE, chunk_overlap_tokens=settings.CHUNK_OVERLAP
        ).split(paper)
        if not any(c.chunk_level == "paragraph" and c.text.strip() for c in chunks):
            _remove_paper(paper_id)
            raise HTTPException(status_code=422, detail="No extractable text (the PDF may be scanned images).")

        _remove_paper(paper_id)
        try:
            chroma.add_chunks(chunks)
        except Exception as exc:
            logger.error("Embedding failed for %s: %s", paper_id, exc)
            chroma.delete_paper(paper_id)
            raise HTTPException(status_code=502, detail="The embedding provider failed; try again later.") from exc
        bm25.add_chunks(chunks)
        graph.upsert_paper(paper_id, paper.title, paper.year, paper.authors)

    if settings.ENABLE_ENTITY_EXTRACTION:
        background.add_task(_extract_entities, paper)

    return {
        "paper_id": paper_id,
        "title": paper.title,
        "chunks": len(chunks),
        "paragraphs": sum(1 for c in chunks if c.chunk_level == "paragraph"),
    }


@router.delete("/papers/{paper_id}")
def delete_paper(paper_id: str):
    check_paper_id(paper_id)
    with _ingest_lock:
        _remove_paper(paper_id)
        path = _paper_path(paper_id)
        if os.path.exists(path):
            os.remove(path)
    return {"paper_id": paper_id, "deleted": True}


@router.get("/papers/{paper_id}")
def paper_status(paper_id: str):
    check_paper_id(paper_id)
    chunks = bm25.chunks_for_paper(paper_id)
    return {"paper_id": paper_id, "indexed": bool(chunks), "chunks": len(chunks)}


@router.get("/papers", response_model=List[str])
def list_papers():
    return bm25.paper_ids()


class PaperMetadata(BaseModel):
    title: Optional[str] = None
    authors: Optional[List[str]] = None
    year: Optional[int] = None


@router.patch("/papers/{paper_id}")
def update_metadata(paper_id: str, meta: PaperMetadata):
    """Updates the title/authors/year used in citations and research tools, without re-embedding."""
    check_paper_id(paper_id)
    with _ingest_lock:
        chunks = bm25.chunks_for_paper(paper_id)
        if not chunks:
            raise HTTPException(status_code=404, detail="Paper is not indexed.")
        current = graph.get_papers([paper_id])
        row = current[0] if current else {}
        title = meta.title.strip()[:500] if meta.title else row.get("title")
        authors = meta.authors if meta.authors is not None else [a.strip() for a in (row.get("authors") or "").split(",") if a.strip()]
        year = meta.year if meta.year is not None else row.get("year")
        graph.upsert_paper(paper_id, title, year, authors)
        bm25.update_paper_metadata(paper_id, title=title, authors=authors, year=year)
        try:
            ids = [c.chunk_id for c in chunks]
            col = chroma.vector_store._collection
            existing = col.get(ids=ids, include=["metadatas"])
            metadatas = []
            for md in existing.get("metadatas") or []:
                md = dict(md or {})
                if title:
                    md["title"] = title
                if authors:
                    md["authors"] = ", ".join(authors)
                if year:
                    md["year"] = year
                metadatas.append(md)
            if metadatas:
                col.update(ids=existing["ids"], metadatas=metadatas)
        except Exception as exc:  # metadata only; never fail the request for it
            logger.warning("Could not update vector metadata for %s: %s", paper_id, exc)
    return {"paper_id": paper_id, "title": title, "year": year}
