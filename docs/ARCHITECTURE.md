# Architecture (current)

> The documents in `docs/archive/` are the original planning documents. They describe an earlier, larger design (Elasticsearch, Neo4j, Kubernetes) that is **not** what the code runs today. This page describes the real system.

## Components

**Web app (`frontend/`)**: Next.js 16 App Router, all pages are client components that call the API through `src/lib/api`. `next.config.ts` rewrites `/api/*`, `/uploads/*` and `/socket.io/*` to the API, so:

- auth cookies (`accessToken` 15 min, `refreshToken` 30 days, both httpOnly) are first-party;
- the API can live on a private network;
- the client refreshes the session automatically on a 401 and retries once.

Large uploads optionally bypass the proxy: the client fetches a 15-minute *upload token* (`GET /auth/upload-token`) and posts the file straight to `NEXT_PUBLIC_UPLOAD_URL`. Upload tokens are accepted only on upload endpoints.

**API (`backend/`)**: Express 5. Layout: `routes/` (validation, auth, rate limits) → `controllers/` → `services/`. Key pieces:

| Area | Files |
|---|---|
| Auth & sessions | `services/authService.js`, `repositories/sessionRepository.js`, `middleware/authMiddleware.js`. Sessions are stored in Postgres (hashed refresh tokens) and Redis (fast revocation check). |
| Posts / feed | `services/feedService.js`, `controllers/postController.js` |
| Reels | `controllers/reelController.js` (feed, likes, comments), `services/reelGeneratorService.js` (scripts and rendering), `services/mediaService.js` (uploads) |
| Media pipeline | `queues/`, `workers/videoWorker.js`, `services/videoRenderer.js`. BullMQ jobs; FFmpeg runs via `execFile` (no shell) and on-screen text is passed through files. |
| Papers | `services/documentService.js` (PDF text extraction with pdf-parse), `controllers/doiController.js` (Crossref) |
| AI | `services/ai/llm.js` (Gemini REST), `services/aiService.js` (questions over one or more papers, research tools), `services/rag/` (Research RAG client and indexer), `services/ai/geminiClient.js` (reel scripts), `services/ai/tts.js` (narration) |
| Realtime | `services/socketService.js`. Socket.io with short-lived socket tokens; rooms per user, conversation and lecture; Redis pub/sub fans out events from the worker and between instances. |
| Notifications | `services/notificationService.js` (in-app + realtime; queues an email job), `services/notificationEmailService.js` (composition, throttling, lecture-reminder sweep), `services/emailPreferences.js` (categories, signed unsubscribe tokens), `workers/emailWorker.js` |
| Comments | `services/commentService.js`: two-level threads (`parent_id` points at the top-level comment, `reply_to_user_id` records who was answered), likes, edits, tombstones for deleted comments with replies, one notification per person (mention > reply > comment) |
| Blocking | `services/blockService.js`: `notBlocked()` / `notMuted()` SQL helpers used by feeds, search, discover, reels, stories, comments and follower lists; `isBlockedEitherWay()` guards follows, likes, comments, messages and notifications |
| Uploads | `middleware/upload.js` (type + signature checks), `middleware/virusScan.js` (ClamAV INSTREAM, fail-closed when configured) |
| Storage | `services/storageService.js`: local disk (`UPLOAD_DIR`) or any S3-compatible bucket |

**Research RAG service (`backend/research_rag/`)**: Python 3.12 + FastAPI, adapted from the Multi-Paper Research RAG System. It is optional and private (the API is its only client, authenticated with `X-API-Key`).

- *Indexing*: `POST /api/v1/papers` with the PDF and ResearchReel's document ID. PyMuPDF parses it into section-aware, hierarchical chunks (section → subsection → paragraph → sentence); paragraphs are embedded into Chroma (Gemini `gemini-embedding-001`) and added to a BM25 keyword index; an LLM pass extracts methods, datasets and relations into a SQLite knowledge graph. Re-indexing an ID replaces it; `DELETE` removes it everywhere.
- *Answering*: `POST /api/v1/query` with the question and the paper IDs to search (required). Pipeline: route planning → intent-based retrieval sizes → query decomposition → dense + BM25 retrieval fused with reciprocal rank fusion and section-aware boosts → optional Cohere rerank → grounded answer → citation check that ties each sentence to a passage (numbered `[n]` markers with page and section).
- *Research tools*: `/api/v1/intel/{compare,review,gaps,contradictions,timeline}` over the selected papers, using the knowledge graph plus opening passages.
- State (Chroma, BM25 pickle, SQLite graph, PDFs) lives in `/app/data` on a disk; the service runs as one process because the BM25 index is in memory.

On the API side, `services/rag/ragClient.js` talks to the service and `services/rag/ragIndexer.js` + `workers/ragWorker.js` keep it in sync through the `rag-index` BullMQ queue (index on upload, metadata on edit, remove on delete; a backfill on start catches up). `documents.rag_status` tracks each paper (`pending → indexing → ready`, or `failed`/`unsupported`). `aiService.ask` checks access to every selected paper, sends only those IDs, and falls back to full-text prompting with Gemini when the service is down or a paper isn't indexed yet.

**Link previews**: `frontend/src/lib/server-api.ts` reads public data server-side over the same private address the proxy uses; `layout.tsx` files under `post/[id]`, `profile/[username]` and `lectures/[id]` add metadata, and `opengraph-image.tsx` files render 1200×630 cards (`lib/og.tsx`). `app/robots.ts` and `app/sitemap.ts` cover crawlers. Which pages signed-out visitors may open is decided in `lib/routes.ts`.

**PostgreSQL**: schema in `backend/migrations/` (node-pg-migrate). All timestamps are `TIMESTAMPTZ`; the connection runs in UTC.

**Redis**: OTP codes, password-reset tokens, session revocation keys, rate-limit counters, AI daily quotas, the BullMQ queues and socket fan-out.

## Security notes

- Passwords: argon2. Login and refresh responses never include password hashes.
- Refresh tokens rotate on every use and each rotated session links to its replacement. Replaying an already-used refresh token more than 30 seconds after rotation (two tabs refreshing together stay safe) revokes the whole chain. In the browser, the Web Locks API makes tabs refresh one at a time. Access, refresh, socket and upload tokens are typed and not interchangeable.
- Blocks are enforced in the API, not just hidden in the UI; muting only affects the muter's feeds.
- Uploads are type-checked by MIME *and* file signature; files are served with `nosniff` and a restrictive CSP.
- Every resource endpoint checks ownership or membership (posts, comments, reels, papers, projects, conversations, lectures). The integration tests cover these checks.
- Role checks read the current role from the database, so demotions and suspensions apply immediately.
- Moderation actions are written to `audit_logs`.

## Tests

`backend/tests/` contains integration tests that hit the real HTTP API against Postgres + Redis. They cover auth flows, permissions, uploads, messaging, projects, events, moderation and the RAG integration (against a stub service). `backend/research_rag/tests/` covers the Python service, including end-to-end API tests with deterministic test models (`LLM_PROVIDER=test`).
