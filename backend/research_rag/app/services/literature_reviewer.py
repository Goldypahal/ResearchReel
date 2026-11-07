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

class LiteratureReviewer:
    def __init__(self, db_path: Optional[str] = None, bm25: Optional[BM25Index] = None):
        self.comparator = PaperComparator(db_path=db_path, bm25=bm25)
        
        self.llm = get_chat_llm()
        self.prompt_loader = PromptLoader()

    def _get_chain(self, version: str = "v1"):
        template = self.prompt_loader.load_prompt("literature_review", version=version)
        prompt = ChatPromptTemplate.from_template(template)
        return prompt | self.llm | StrOutputParser()

    @retry_api_call(max_attempts=3, min_wait=1, max_wait=10)
    def _call_llm(self, chain, facts: str) -> str:
        return chain.invoke({"facts": facts})

    def generate_review(self, paper_ids: List[str], prompt_version: str = "v1") -> str:
        """Generates a structured literature review based on the facts of selected papers."""
        logger.info(f"Generating literature review for papers: {paper_ids}")
        if not paper_ids:
            return "No papers selected for literature review."

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
            review = self._call_llm(chain, combined_facts)
            return review
        except Exception as e:
            logger.error(f"Failed to generate literature review: {e}")
            return "Failed to generate literature review survey due to an LLM error."
