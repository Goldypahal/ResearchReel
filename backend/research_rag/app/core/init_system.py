import os

from .settings import settings


def ensure_directories():
    for path in (
        settings.CHROMA_DB_PATH,
        settings.PAPERS_DIR,
        os.path.dirname(settings.BM25_INDEX_PATH) or ".",
        os.path.dirname(settings.GRAPH_DB_PATH) or ".",
        "data/traces",
        "data/feedback",
    ):
        os.makedirs(path, exist_ok=True)
