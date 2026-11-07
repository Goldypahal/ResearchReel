from __future__ import annotations
import logging
from typing import List, Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from ..core.settings import settings
from ..core.llm_factory import get_chat_llm
from ..core.retry_utils import retry_api_call
from ..generation.prompt_loader import PromptLoader
from .paper_comparator import PaperComparator
from ..indexing.bm25_index import BM25Index

logger = logging.getLogger(__name__)

class ContradictionDetector:
    def __init__(self, db_path: Optional[str] = None, bm25: Optional[BM25Index] = None):
        self.comparator = PaperComparator(db_path=db_path, bm25=bm25)
        
        self.llm = get_chat_llm()
        self.prompt_loader = PromptLoader()

    def _get_chain(self, version: str = "v1"):
        template = self.prompt_loader.load_prompt("detect_contradictions", version=version)
        prompt = ChatPromptTemplate.from_template(template)
        return prompt | self.llm | StrOutputParser()

    @retry_api_call(max_attempts=3, min_wait=1, max_wait=10)
    def _call_llm(self, chain, facts: str) -> str:
        return chain.invoke({"facts": facts})

    def detect_contradictions(self, paper_ids: List[str], prompt_version: str = "v1") -> str:
        """Compares papers to find potential contradictions or misalignments in findings."""
        logger.info(f"Detecting contradictions for papers: {paper_ids}")
        if not paper_ids:
            return "No papers selected for contradiction detection."

        all_facts = []
        for pid in paper_ids:
            facts = self.comparator.get_paper_facts(pid)
            if facts:
                all_facts.append(facts)
            else:
                all_facts.append(f"No data available for Paper '{self.comparator._label(pid)}'.")

        combined_facts = "\n\n===\n\n".join(all_facts)
        try:
            chain = self._get_chain(version=prompt_version)
            audit_report = self._call_llm(chain, combined_facts)
            return audit_report
        except Exception as e:
            logger.error(f"Failed to detect contradictions: {e}")
            return "Failed to perform contradiction audit due to an LLM error."
