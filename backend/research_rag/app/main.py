from contextlib import asynccontextmanager
import hmac
import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .api import routes_ingest, routes_query, routes_eval, routes_feedback
import uvicorn
import time
import logging

from .core.init_system import ensure_directories

logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    ensure_directories()
    yield
    # Shutdown (cleanup can be added here)


app = FastAPI(title="Research RAG Pipeline", lifespan=lifespan)

RAG_API_KEY = os.getenv("RAG_API_KEY", "")
PUBLIC_PATHS = ("/api/ai/health",)


@app.middleware("http")
async def require_api_key(request: Request, call_next):
    """Internal service: when RAG_API_KEY is set, every API call must carry it in x-api-key."""
    path = request.url.path
    if RAG_API_KEY and path.startswith("/api/") and path not in PUBLIC_PATHS:
        supplied = request.headers.get("x-api-key", "")
        if not hmac.compare_digest(supplied, RAG_API_KEY):
            return JSONResponse(status_code=401, content={"detail": "Invalid or missing API key"})
    return await call_next(request)

app.include_router(routes_ingest.router, prefix="/api/v1")
app.include_router(routes_query.router, prefix="/api/v1")
app.include_router(routes_eval.router, prefix="/api/v1")
app.include_router(routes_feedback.router, prefix="/api/v1")

@app.get("/api/ai/health")
async def ai_health():
    return {
        "status": "UP",
        "service": "ai-rag-service",
        "database": "ChromaDB + BM25",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

@app.post("/api/ai/ask-gemini")
async def ask_gemini_endpoint(payload: dict):
    question = payload.get("question", "")
    document_id = payload.get("document_id")
    # Filters by paper_id if document_id is provided
    filters = {"paper_id": [document_id]} if document_id else None
    
    try:
        from .api.routes_query import query_service
        result = query_service.ask(question, filters=filters)
        
        citations = []
        for c in result.get("citations", []):
            citations.append({
                "page": c.get("page") or c.get("page_start") or 1,
                "section": c.get("section") or c.get("label") or "General",
                "text": c.get("quote") or c.get("text") or "..."
            })
            
        return {
            "success": True,
            "data": {
                "answer": result.get("answer", "No answer found."),
                "citations": citations,
                "latency": result.get("latency", 0.0)
            }
        }
    except Exception as e:
        import traceback
        logger.error(f"Error in ask-gemini endpoint: {e}\n{traceback.format_exc()}")
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(e)}
        )

# Serve UI
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
async def root():
    return FileResponse("app/static/index.html")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

