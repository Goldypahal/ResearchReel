# Research RAG service

Multi-paper retrieval-augmented generation for ResearchReel, adapted from
[Multi-Paper Research RAG System](https://github.com/Goldypahal/Multi-Paper-Research-RAG-System-).
ResearchReel's API is its only client: it sends each uploaded PDF under the paper's document ID,
then asks questions over the papers a user is allowed to read.

## What it does

- **Indexing**: PyMuPDF parsing → section-aware hierarchical chunks → Chroma (dense) + BM25 (keyword) indexes,
  plus a SQLite knowledge graph of methods, datasets and relations extracted by the LLM.
- **Questions**: route planning, query decomposition, intent-based retrieval sizes, hybrid search with reciprocal
  rank fusion, optional Cohere reranking, a grounded answer, and a citation check that ties each sentence to a
  passage (`[1]`, `[2]` with page and section).
- **Research tools**: compare papers, literature review, research gaps, contradictions, timeline.

## API

All `/api/v1` routes need the `X-API-Key` header (the `RAG_API_KEY` value). `GET /health` is open.

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/api/v1/papers` | multipart: `file`, `paper_id`, optional `title`, `authors` (comma separated), `year`, `doi` | Index or re-index a PDF |
| PATCH | `/api/v1/papers/{id}` | `{title, authors, year}` | Update metadata without re-embedding |
| DELETE | `/api/v1/papers/{id}` | | Remove a paper everywhere |
| GET | `/api/v1/papers`, `/api/v1/papers/{id}` | | Indexed IDs / one paper's status |
| POST | `/api/v1/query` | `{query, paper_ids}` | Answer with citations; only `paper_ids` are searched |
| POST | `/api/v1/intel/{compare,review,gaps,contradictions,timeline,graph}` | `{paper_ids}` | Research tools |

Errors: `400` bad input, `401` wrong key, `409` papers not indexed, `413`/`415`/`422` PDF too large / not a PDF /
no extractable text, `502` the model provider failed.

## Configuration

See `.env.example`. The essentials: `RAG_API_KEY`, `GEMINI_API_KEY` (or `GOOGLE_API_KEY`), and optionally
`COHERE_API_KEY`. `LLM_PROVIDER=ollama` runs fully locally (install `requirements-local.txt` and run Ollama).
Each `ENABLE_*` switch removes one LLM call per question if you need to cut cost or latency.

Changing `GEMINI_EMBEDDING_MODEL` starts a new, empty vector collection; re-index with
`npm run rag:reindex -- --all` from `backend/`.

## Run and test

```bash
pip install -r requirements-dev.txt
RAG_API_KEY=dev-key GEMINI_API_KEY=... uvicorn app.main:app --port 8000

LLM_PROVIDER=test PYTHONPATH=. pytest tests/unit tests/integration
PYTHONPATH=. pytest tests/api        # starts the app with deterministic test models
```

Run one process only (`--workers 1`): the keyword index lives in memory. Data is stored under `data/`
(`/app/data` in Docker; mount a persistent disk there).
