from __future__ import annotations
import logging
import sqlite3
from typing import List, Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from ..core.settings import settings
from ..core.llm_factory import get_chat_llm
from ..core.retry_utils import retry_api_call
from ..generation.prompt_loader import PromptLoader

logger = logging.getLogger(__name__)

class ResearchTimelineGenerator:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or settings.GRAPH_DB_PATH
        
        self.llm = get_chat_llm()
        self.prompt_loader = PromptLoader()

    def _get_chain(self, version: str = "v1"):
        template = self.prompt_loader.load_prompt("timeline", version=version)
        prompt = ChatPromptTemplate.from_template(template)
        return prompt | self.llm | StrOutputParser()

    @retry_api_call(max_attempts=3, min_wait=1, max_wait=10)
    def _call_llm(self, chain, facts: str) -> str:
        return chain.invoke({"facts": facts})

    def _get_sorted_paper_metadata(self, paper_ids: Optional[List[str]] = None) -> str:
        """Papers (title, year, main methods) sorted chronologically."""
        if not paper_ids:
            return ""
        placeholders = ",".join("?" for _ in paper_ids)
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(f"SELECT paper_id, title, year FROM papers WHERE paper_id IN ({placeholders})", paper_ids)
            papers = [dict(r) for r in cursor.fetchall()]
            papers.sort(key=lambda p: (p["year"] is None, p["year"] or 0))

            fact_lines = []
            for p in papers:
                cursor.execute(
                    "SELECT DISTINCT name FROM entities WHERE paper_id = ? AND type IN ('Method', 'Algorithm', 'Model')",
                    (p["paper_id"],),
                )
                methods = [r["name"] for r in cursor.fetchall()]
                fact_lines.append(f"Year {p['year'] if p['year'] else 'unknown'}:")
                fact_lines.append(f"- Title: {p['title'] or p['paper_id']}")
                fact_lines.append(f"- ID: {p['paper_id']}")
                fact_lines.append(f"- Focus Methods: {', '.join(methods) if methods else 'None documented'}")
                fact_lines.append("")
        return "\n".join(fact_lines)

    def generate_timeline(self, paper_ids: Optional[List[str]] = None, prompt_version: str = "v1") -> str:
        """Generates a chronological evolution timeline of the selected papers."""
        logger.info("Generating chronological research timeline...")
        facts = self._get_sorted_paper_metadata(paper_ids)
        if not facts.strip():
            return "None of the selected papers has been indexed yet."
        try:
            chain = self._get_chain(version=prompt_version)
            timeline = self._call_llm(chain, facts)
            return timeline
        except Exception as e:
            logger.error(f"Failed to generate timeline: {e}")
            return "Failed to compile chronological research timeline due to an LLM error."
