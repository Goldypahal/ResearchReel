"""Process-wide index singletons shared by every router and service."""
from ..indexing.bm25_index import BM25Index
from ..indexing.chroma_index import ChromaIndex
from ..indexing.graph_index import SQLiteGraphIndex
from .settings import settings

chroma = ChromaIndex()
bm25 = BM25Index()
graph = SQLiteGraphIndex(db_path=settings.GRAPH_DB_PATH)
