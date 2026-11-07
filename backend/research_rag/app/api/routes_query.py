from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from ..retrieval.hybrid_retriever import HybridRetriever
from ..indexing.chroma_index import ChromaIndex
from ..indexing.bm25_index import BM25Index
from ..retrieval.rerank_sbert import SBERTReranker
from ..generation.answer_chain import AnswerChain
from ..retrieval.citation_enforcer import CitationEnforcer
import time

router = APIRouter()

class QueryRequest(BaseModel):
    query: str
    paper_ids: Optional[List[str]] = None
    expand_context: bool = False
    prompt_version: str = "v1"

class QueryResponse(BaseModel):
    answer: str
    chunks: List[dict]
    latency: float

from ..services.query_service import QueryService

# Initialize components
chroma = ChromaIndex()
bm25 = BM25Index()
reranker = SBERTReranker()
retriever = HybridRetriever(chroma, bm25, reranker=reranker)
generator = AnswerChain()
enforcer = CitationEnforcer()

query_service = QueryService(retriever, generator, enforcer)

@router.post("/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    # The index holds every user's papers, including private ones. The API
    # resolves which papers the caller may read; an unscoped query is refused.
    if not request.paper_ids:
        raise HTTPException(status_code=400, detail="paper_ids is required: queries must be scoped to papers the caller can read.")
    filters = {"paper_id": request.paper_ids}
    result = query_service.ask(request.query, filters=filters, expand_context=request.expand_context, prompt_version=request.prompt_version)
    return QueryResponse(
        answer=result['answer'],
        chunks=result['chunks'],
        latency=result['latency']
    )

@router.post("/compare", response_model=QueryResponse)
async def compare_papers(request: QueryRequest):
    if not request.paper_ids or len(request.paper_ids) < 2:
        raise HTTPException(status_code=400, detail="Comparison requires at least two paper_ids.")
    
    # Simple multi-paper query using service
    result = query_service.ask(request.query, filters={"paper_id": request.paper_ids}, prompt_version=request.prompt_version)
    
    return QueryResponse(
        answer=result['answer'],
        chunks=result['chunks'],
        latency=result['latency']
    )
