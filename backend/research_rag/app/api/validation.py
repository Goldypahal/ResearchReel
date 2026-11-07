import re
from typing import List

from fastapi import HTTPException

PAPER_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$")


def check_paper_id(paper_id: str) -> str:
    if not paper_id or not PAPER_ID_RE.match(paper_id):
        raise HTTPException(status_code=400, detail="paper_id must be 1-128 letters, digits, '-' or '_'.")
    return paper_id


def check_paper_ids(paper_ids: List[str], minimum: int = 1, maximum: int = 50) -> List[str]:
    ids = list(dict.fromkeys(paper_ids or []))
    if len(ids) < minimum:
        raise HTTPException(status_code=400, detail=f"Select at least {minimum} paper(s).")
    if len(ids) > maximum:
        raise HTTPException(status_code=400, detail=f"Select at most {maximum} papers.")
    for pid in ids:
        check_paper_id(pid)
    return ids
