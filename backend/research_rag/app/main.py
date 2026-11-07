import os

# Keep native thread pools small; this service runs in modest containers.
for _var in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "OPENBLAS_NUM_THREADS", "VECLIB_MAXIMUM_THREADS", "NUMEXPR_NUM_THREADS"):
    os.environ.setdefault(_var, "1")

import logging  # noqa: E402
import threading  # noqa: E402
from contextlib import asynccontextmanager  # noqa: E402

from fastapi import Depends, FastAPI  # noqa: E402

from .api import routes_feedback, routes_ingest, routes_intel, routes_query  # noqa: E402
from .api.security import require_api_key  # noqa: E402
from .core.init_system import ensure_directories  # noqa: E402
from .core.settings import settings  # noqa: E402

logger = logging.getLogger("research_rag")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_directories()
    from .core.indexes import bm25, chroma

    logger.info("Research RAG ready: provider=%s, papers=%d", settings.provider, len(bm25.paper_ids()))
    if settings.AUTO_INGEST:
        from .core.auto_ingest import run_auto_ingest_background

        threading.Thread(target=run_auto_ingest_background, args=(chroma, bm25), daemon=True).start()
    yield


app = FastAPI(title="ResearchReel Research RAG", lifespan=lifespan, docs_url=None, redoc_url=None)

secured = [Depends(require_api_key)]
app.include_router(routes_ingest.router, prefix="/api/v1", dependencies=secured)
app.include_router(routes_query.router, prefix="/api/v1", dependencies=secured)
app.include_router(routes_intel.router, prefix="/api/v1/intel", dependencies=secured)
app.include_router(routes_feedback.router, prefix="/api/v1", dependencies=secured)


@app.get("/health")
def health():
    from .core.indexes import bm25

    return {"status": "ok", "provider": settings.provider, "papers": len(bm25.paper_ids())}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
