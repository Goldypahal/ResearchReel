from __future__ import annotations
import logging
import sqlite3
from typing import List, Dict, Any, Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from ..core.settings import settings
from ..core.llm_factory import get_chat_llm
from ..core.retry_utils import retry_api_call
from ..generation.prompt_loader import PromptLoader
from ..indexing.graph_index import SQLiteGraphIndex
from ..indexing.bm25_index import BM25Index

logger = logging.getLogger(__name__)

class PaperComparator:
    def __init__(self, db_path: Optional[str] = None, bm25: Optional[BM25Index] = None):
        self.db_path = db_path or settings.GRAPH_DB_PATH
        self.bm25 = bm25
        
        self.llm = get_chat_llm()
        self.prompt_loader = PromptLoader()

    def _get_chain(self, version: str = "v1"):
        template = self.prompt_loader.load_prompt("compare_features", version=version)
        prompt = ChatPromptTemplate.from_template(template)
        return prompt | self.llm | StrOutputParser()

    @retry_api_call(max_attempts=3, min_wait=1, max_wait=10)
    def _call_llm(self, chain, facts: str) -> str:
        return chain.invoke({"facts": facts})

    def _get_paper_facts_from_db(self, paper_id: str) -> str:
        """Query entities and relationships from the SQLite graph index."""
        facts_lines = []
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Fetch entities
            cursor.execute("SELECT name, type FROM entities WHERE paper_id = ?", (paper_id,))
            entities = cursor.fetchall()
            if entities:
                facts_lines.append(f"Paper '{self._label(paper_id)}' contains entities:")
                for ent in entities:
                    facts_lines.append(f"  * {ent['name']} ({ent['type']})")
                    
            # Fetch relations
            cursor.execute("""
                SELECT e1.name AS src, e1.type AS src_type, e2.name AS target, e2.type AS target_type, r.relation_type, r.description
                FROM relations r
                JOIN entities e1 ON r.source_id = e1.entity_id
                JOIN entities e2 ON r.target_id = e2.entity_id
                WHERE e1.paper_id = ?
            """, (paper_id,))
            relations = cursor.fetchall()
            if relations:
                facts_lines.append(f"Paper '{self._label(paper_id)}' relationships:")
                for rel in relations:
                    desc = f" ({rel['description']})" if rel['description'] else ""
                    facts_lines.append(f"  * {rel['src']} ({rel['src_type']}) - {rel['relation_type']} -> {rel['target']} ({rel['target_type']}){desc}")
                    
        return "\n".join(facts_lines)

    def _label(self, paper_id: str) -> str:
        try:
            with sqlite3.connect(self.db_path) as conn:
                row = conn.execute("SELECT title, year FROM papers WHERE paper_id = ?", (paper_id,)).fetchone()
            if row and row[0]:
                return f"{row[0]} ({row[1]})" if row[1] else row[0]
        except sqlite3.Error:
            pass
        return paper_id

    def _get_paper_facts_from_chunks(self, paper_id: str, max_chars: int = 6000) -> str:
        """Opening passages of the paper (abstract/introduction), used alongside graph facts."""
        if not self.bm25:
            return ""
        paper_chunks = [c for c in self.bm25.chunks_for_paper(paper_id) if c.chunk_level == "paragraph"][:6]
        if not paper_chunks:
            return ""
        text = "\n\n".join(c.text for c in paper_chunks)[:max_chars]
        return f"Paper '{self._label(paper_id)}' text excerpts:\n{text}"

    def get_paper_facts(self, paper_id: str) -> str:
        parts = [self._get_paper_facts_from_db(paper_id), self._get_paper_facts_from_chunks(paper_id)]
        return "\n\n".join(x for x in parts if x)

    def compare_papers(self, paper_ids: List[str], prompt_version: str = "v1") -> str:
        """Generates a markdown comparison matrix table for a list of papers."""
        logger.info(f"Comparing papers: {paper_ids}")
        if not paper_ids:
            return "No papers selected for comparison."

        all_facts = []
        for pid in paper_ids:
            facts = self.get_paper_facts(pid)
            if facts:
                all_facts.append(facts)
            else:
                all_facts.append(f"No data available for Paper '{self._label(pid)}'.")

        combined_facts = "\n\n===\n\n".join(all_facts)
        try:
            chain = self._get_chain(version=prompt_version)
            markdown_table = self._call_llm(chain, combined_facts)
            return markdown_table
        except Exception as e:
            logger.error(f"Failed to generate paper comparison: {e}")
            return "Failed to generate comparison matrix due to an LLM error."
