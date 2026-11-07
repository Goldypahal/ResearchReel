"""
Builds the query pipeline components for the configured provider.
"""
from __future__ import annotations

import logging

from .settings import settings

logger = logging.getLogger(__name__)


def build_reranker():
    if settings.provider == "ollama":
        from ..retrieval.rerank_sbert import SBERTReranker
        return SBERTReranker()
    if settings.COHERE_API_KEY:
        from ..retrieval.rerank_cohere import CohereReranker
        return CohereReranker(model=settings.COHERE_RERANK_MODEL)
    logger.info("No reranker configured; results are ordered by the hybrid score.")
    return None


def build_components():
    """Returns a (generator, enforcer, reranker) tuple."""
    from ..generation.answer_chain import AnswerChain
    from ..retrieval.citation_enforcer import CitationEnforcer

    return AnswerChain(), CitationEnforcer(), build_reranker()
