"""Heuristic detection of numbered section headings such as "3.1 Experimental Setup"."""
import re
from typing import Optional, Tuple

_HEADING_RE = re.compile(r"^(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+([A-Z][^|]{1,90}?)\s*$")


def match_heading(line: str) -> Optional[Tuple[str, str]]:
    """Returns (number, title) when the line looks like a numbered heading."""
    m = _HEADING_RE.match(line.strip())
    if not m:
        return None
    number, title = m.group(1), m.group(2).strip()
    if int(number.split(".")[0]) > 20:
        return None
    words = title.split()
    if len(words) > 12 or title[-1] in ".,;:" or sum(ch.isalpha() for ch in title) < 3:
        return None
    # Affiliation lines and running text tend to be long lowercase sentences.
    if len(words) > 4 and sum(w[0].isupper() for w in words if w[0].isalpha()) < 2 and not title.isupper():
        return None
    if re.search(r"\b(university|department|institute|@|vol\.|no\.|et al)", title, re.I):
        return None
    # Reference-list entries ("12 Smith, J.A. & Doe, B. Title...") and running sentences.
    if title.count(",") > 1 or ". " in title or re.search(r"\b[A-Z]\.[A-Z]?\.?(\s|,|$)", title):
        return None
    if re.match(r"^(January|February|March|April|May|June|July|August|September|October|November|December)\b", title):
        return None
    return number, title
