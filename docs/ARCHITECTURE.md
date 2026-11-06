# Architecture (current)

> The documents in `docs/archive/` are the original planning documents. They describe an earlier, larger design (Elasticsearch, Neo4j, Kubernetes, a Python RAG service) that is **not** what the code runs today. This page describes the real system.

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
| AI | `services/ai/llm.js` (Gemini REST), `services/aiService.js`, `services/ai/geminiClient.js` (reel scripts), `services/ai/tts.js` (narration) |
| Realtime | `services/socketService.js`. Socket.io with short-lived socket tokens; rooms per user, conversation and lecture; Redis pub/sub fans out events from the worker and between instances. |
| Notifications | `services/notificationService.js` |
| Storage | `services/storageService.js`: local disk (`UPLOAD_DIR`) or any S3-compatible bucket |

**PostgreSQL**: schema in `backend/migrations/` (node-pg-migrate). All timestamps are `TIMESTAMPTZ`; the connection runs in UTC.

**Redis**: OTP codes, password-reset tokens, session revocation keys, rate-limit counters, AI daily quotas, the BullMQ queues and socket fan-out.

## Security notes

- Passwords: argon2. Login and refresh responses never include password hashes.
- Refresh tokens rotate on every use; access, refresh, socket and upload tokens are typed and not interchangeable.
- Uploads are type-checked by MIME *and* file signature; files are served with `nosniff` and a restrictive CSP.
- Every resource endpoint checks ownership or membership (posts, comments, reels, papers, projects, conversations, lectures). The integration tests cover these checks.
- Role checks read the current role from the database, so demotions and suspensions apply immediately.
- Moderation actions are written to `audit_logs`.

## Tests

`backend/tests/` contains integration tests that hit the real HTTP API against Postgres + Redis. They cover auth flows, permissions, uploads, messaging, projects, events and moderation.
