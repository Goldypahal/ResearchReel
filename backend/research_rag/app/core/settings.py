from typing import Optional

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    All configuration comes from environment variables (or a local .env file).

    LLM_PROVIDER decides which models the pipeline uses:
      - "gemini": Gemini for generation and embeddings (the default when a key is set).
                  Cohere reranking is used when COHERE_API_KEY is set; otherwise
                  results are ranked by the hybrid (dense + BM25) score.
      - "ollama": fully local, Ollama for generation plus local HuggingFace
                  embeddings/reranker (needs the packages in requirements.txt).
      - "test":   deterministic fake models for automated tests. Never use in production.
    """

    CHROMA_DB_PATH: str = "data/chroma_db"
    BM25_INDEX_PATH: str = "data/bm25_index.pkl"
    GRAPH_DB_PATH: str = "data/knowledge_graph.db"
    PAPERS_DIR: str = "data/raw_papers"

    # Shared secret that callers must send in the X-API-Key header.
    # Empty disables auth (local development only; a warning is logged).
    RAG_API_KEY: Optional[str] = None

    LLM_PROVIDER: Optional[str] = None  # gemini | ollama | test; auto when unset

    # Cloud keys. GEMINI_API_KEY is accepted as an alias so one variable can
    # serve both ResearchReel's API and this service.
    GOOGLE_API_KEY: Optional[str] = Field(default=None, validation_alias=AliasChoices("GOOGLE_API_KEY", "GEMINI_API_KEY"))
    COHERE_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    GEMINI_MODEL: str = "gemini-flash-latest"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    COHERE_RERANK_MODEL: str = "rerank-v3.5"

    # Local Ollama settings
    OLLAMA_MODEL: str = "gemma2:2b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # Kept for compatibility with older code paths; derived from LLM_PROVIDER.
    USE_LOCAL_LLM: bool = False
    USE_LOCAL_RERANKER: bool = False

    # Query pipeline switches. Each extra step costs one LLM call per question.
    ENABLE_QUERY_PLANNER: bool = True
    ENABLE_QUERY_DECOMPOSITION: bool = True
    ENABLE_ADAPTIVE_RETRIEVAL: bool = True
    ENABLE_CITATION_CHECK: bool = True
    ENABLE_ENTITY_EXTRACTION: bool = True
    SEMANTIC_CHUNKING: bool = False  # needs sentence-transformers

    # Optional: index the PDFs in PAPERS_DIR on startup when the index is empty.
    AUTO_INGEST: bool = False

    MAX_UPLOAD_MB: int = 100
    LOG_LEVEL: str = "INFO"

    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 100

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", populate_by_name=True)

    @property
    def provider(self) -> str:
        p = (self.LLM_PROVIDER or "").strip().lower()
        if p in {"gemini", "ollama", "test"}:
            return p
        return "gemini" if self.GOOGLE_API_KEY else "ollama"


settings = Settings()
settings.USE_LOCAL_LLM = settings.provider == "ollama"
settings.USE_LOCAL_RERANKER = settings.provider == "ollama"
