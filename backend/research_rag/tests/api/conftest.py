import os
import tempfile

# Configure an isolated data directory and the deterministic test models
# before the app (and its settings singleton) is imported.
_DATA = tempfile.mkdtemp(prefix="rag-api-test-")
os.environ.update(
    LLM_PROVIDER="test",
    RAG_API_KEY="test-key",
    CHROMA_DB_PATH=os.path.join(_DATA, "chroma"),
    BM25_INDEX_PATH=os.path.join(_DATA, "bm25.pkl"),
    GRAPH_DB_PATH=os.path.join(_DATA, "graph.db"),
    PAPERS_DIR=os.path.join(_DATA, "papers"),
)

import pymupdf  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

HEADERS = {"X-API-Key": "test-key"}


def make_pdf(sections):
    """Builds a small text PDF; sections is a list of (heading, paragraph)."""
    doc = pymupdf.open()
    for heading, body in sections:
        page = doc.new_page()
        text = f"{heading}\n\n{body}"
        page.insert_textbox(pymupdf.Rect(50, 50, 550, 800), text, fontsize=10)
    data = doc.tobytes()
    doc.close()
    return data


@pytest.fixture(scope="session")
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def pdfs():
    filler = " ".join(["The experiments were repeated five times and averaged."] * 8)
    a = make_pdf([
        ("1 Introduction", "Graph neural networks learn representations of molecules. " + filler),
        ("2 Methods", "We train a message passing network on the QM9 dataset with a learning rate of 0.001. " + filler),
    ])
    b = make_pdf([
        ("1 Introduction", "Protein function prediction is evaluated in the CAFA challenge. " + filler),
        ("2 Results", "Our ensemble improved Fmax to 0.62 on the CAFA3 benchmark. " + filler),
    ])
    return a, b
