"""Retrieval must stay inside the papers the API says the caller may read."""
import sys
import types

import pytest


@pytest.fixture(autouse=True)
def stub_vector_deps(monkeypatch):
    # chroma_index imports the embedding stack at module level; the helpers
    # under test don't need it.
    for name, attrs in {"langchain_chroma": ["Chroma"], "langchain_ollama": ["OllamaEmbeddings"]}.items():
        mod = types.ModuleType(name)
        for attr in attrs:
            setattr(mod, attr, object)
        monkeypatch.setitem(sys.modules, name, mod)


def test_list_filter_becomes_chroma_in_operator():
    from app.indexing.chroma_index import ChromaIndex

    assert ChromaIndex.to_where({"paper_id": ["a", "b"]}) == {"paper_id": {"$in": ["a", "b"]}}
    assert ChromaIndex.to_where({"paper_id": ["a"]}) == {"paper_id": "a"}
    assert ChromaIndex.to_where(None) is None


def test_bm25_only_returns_allowed_papers(monkeypatch):
    from app.indexing.bm25_index import BM25Index
    from app.models.chunk import Chunk

    monkeypatch.setattr(BM25Index, "save", lambda self: None)
    index = BM25Index.__new__(BM25Index)
    index.chunks, index.bm25 = [], None
    index.add_chunks([
        Chunk(chunk_id=f"c{i}", paper_id=pid, text=f"graphene superconductivity result {i}")
        for i, pid in enumerate(["mine", "private-other", "mine", "private-other"])
    ])
    hits = index.query("graphene", k=10, filters={"paper_id": ["mine"]})
    assert len(hits) == 2
    assert all(chunk.paper_id == "mine" for chunk, _ in hits)
