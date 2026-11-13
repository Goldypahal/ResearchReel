# ResearchReel

A social platform for research. People share findings as posts, papers and short video reels, follow each other, discuss, collaborate on projects, host live lectures, and ask an AI assistant about papers.

## Features

- **Accounts**: email sign-up with a verification code, password reset, session management, ORCID-verified researcher badges
- **Feed**: posts with text, images or a PDF paper; likes, bookmarks, #tags and @mentions; "Following" and "Everyone" feeds; 24-hour stories
- **Discussions**: threaded comments with replies, @mention suggestions, likes, edits and Top/Newest sorting
- **Safety**: block (both accounts disappear for each other) and mute (quietly hide someone from your feeds); ClamAV malware scanning of uploads (optional)
- **Reels**: vertical video feed; upload your own video, or generate an explainer reel from a paper (script → editable scenes → rendered MP4 with optional AI narration)
- **Library**: upload PDFs (text is extracted for search and AI), or import publications by DOI or ORCID via Crossref
- **AI assistant** (optional, Gemini): ask questions about up to ten papers at once, with answers that cite the page each point comes from; summaries; conversation history
- **Research tools** (with the Research RAG service): compare papers, draft a literature review, find research gaps and contradictions, build a timeline
- **Messages**: direct messages with live delivery, unread counts and typing indicators
- **Notifications**: follows, likes, comments, replies, mentions, project invites, lectures, reel processing, all live in the app; email for each category the user leaves on, with one-click unsubscribe
- **Projects**: members and roles, drag-and-drop task boards, shared papers; a "My tasks" board across projects
- **Lectures**: schedule or go live, registration with a private meeting link, live discussion, reminders a day and an hour before, add-to-calendar (.ics), cancellation notices
- **Sharing**: posts, profiles, lectures, Explore and Reels open without signing in, with link-preview images; robots.txt and a sitemap
- **Discovery**: search (people, papers, posts, reels, tags), discover, explore, conference deadline tracker, leaderboard, achievements
- **Moderation**: reporting, moderator console (reports, users, suspensions, roles), audit log

## Architecture

```
Browser ──► Next.js web app (frontend/) ──proxy /api, /uploads, /socket.io──► Express API (backend/)
                                                                               │  ├─ PostgreSQL (data)
Large uploads (optional) ─────────── direct to API with upload token ──────────┤  ├─ Redis (sessions, rate limits, jobs, realtime)
                                                                               │  ├─ BullMQ worker + FFmpeg (reels)
                                                                               │  ├─ Disk or S3-compatible storage (files)
                                                                               │  ├─ Gemini API (optional AI)
                                                                               │  └─ Research RAG service (backend/research_rag, private)
                                                                               │       Python/FastAPI · Chroma + BM25 hybrid search · knowledge graph
```

Every uploaded PDF is sent to the Research RAG service in the background and indexed under its document ID. Questions about papers are answered from the most relevant passages, with page citations; if the service is unavailable the API falls back to sending the papers' full text to Gemini. Access control stays in the API: the service only ever searches the paper IDs the API passes.

The browser only talks to the web app's domain; the web server proxies API calls, files and websockets to the API. This keeps auth cookies first-party and lets the API run on a private network. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run it locally

Requirements: Node.js 20+, PostgreSQL 14+, Redis 6+, FFmpeg (for reels).

```bash
# 1. Backend
cd backend
cp .env.example .env            # edit DATABASE_URL / REDIS_URL if needed
npm install
npm run migrate                 # create the database schema
npm run dev                     # API on http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                     # web app on http://localhost:3000
```

Optional: multi-paper search (needs Python 3.12 and a Gemini key):

```bash
cd backend/research_rag
pip install -r requirements.txt
RAG_API_KEY=dev-key GEMINI_API_KEY=... uvicorn app.main:app --port 8000
# then in backend/.env: RAG_SERVICE_URL=http://localhost:8000 and RAG_API_KEY=dev-key
```

Open http://localhost:3000 and create an account. Without email configured, the verification code is printed in the backend console. To skip email verification locally, set `REQUIRE_EMAIL_VERIFICATION=false` in `backend/.env`.

Create an admin account (for the moderation console):

```bash
cd backend
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run seed
```

### With Docker

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
docker compose up --build
```

## Tests

```bash
cd backend && npm test          # integration tests; needs Postgres + Redis
cd frontend && npm run lint && npm run build
cd e2e && npm ci && npx playwright install chromium && npx playwright test   # browser tests; needs the stack + Mailpit running
cd backend/research_rag && pip install -r requirements-dev.txt \
  && LLM_PROVIDER=test PYTHONPATH=. pytest tests/unit tests/integration && PYTHONPATH=. pytest tests/api
```

Backend tests create a throwaway `researchreel_test` database. The browser tests (`e2e/`) run against a running stack whose API sends mail to [Mailpit](https://mailpit.axllent.org/) (`SMTP_HOST=localhost SMTP_PORT=1025`), so sign-up codes and notification emails are read from real messages. Point them elsewhere with `TEST_DATABASE_URL` and `TEST_REDIS_URL`. CI runs everything on every push (`.github/workflows/ci.yml`).

## Deploy

See **[DEPLOYMENT.md](DEPLOYMENT.md)**. It's a one-click Render Blueprint (`render.yaml`) plus a checklist of the settings you need to fill in.

## Configuration

All backend settings are documented in [`backend/.env.example`](backend/.env.example) and frontend settings in [`frontend/.env.example`](frontend/.env.example). The important ones:

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` | API | Required |
| `FRONTEND_URL` | API | Public URL of the web app (CORS, email links) |
| `RESEND_API_KEY` (or `SMTP_*`), `EMAIL_FROM` | API | Sending verification codes, reset links and notifications |
| `REQUIRE_EMAIL_VERIFICATION` | API | Set `false` to allow sign-up without email |
| `GEMINI_API_KEY` | API, RAG | Turns on AI features (optional) |
| `RAG_SERVICE_URL`, `RAG_API_KEY` | API | Connects the Research RAG service (optional) |
| `S3_*` | API | Store files in S3/R2 instead of local disk (optional) |
| `CLAMAV_HOST` | API | Scan uploads with ClamAV (optional; uploads are refused if it's set and unreachable) |
| `NEXT_PUBLIC_SITE_URL` | Web | Your public domain for link previews and the sitemap (defaults to the Render URL) |
| `BACKEND_URL` / `BACKEND_HOSTPORT` | Web (build) | Where the web app proxies the API |
| `NEXT_PUBLIC_UPLOAD_URL` | Web (build) | Public API URL for direct large uploads (recommended) |

## Project layout

```
backend/
  src/            Express app: routes → controllers → services; socket.io; BullMQ worker
  migrations/     node-pg-migrate schema migrations (run automatically in Docker)
  tests/          integration tests (Postgres + Redis)
  research_rag/   Research RAG service (Python/FastAPI): paper indexing, cited answers, research tools
frontend/
  src/app/        Next.js App Router pages
  src/components/ UI components
  src/lib/api/    typed API client
e2e/              Playwright browser tests (sign-up by email, comments, blocking, lectures, sharing, every page on desktop and phone)
docs/             architecture notes; docs/archive holds the original planning documents
render.yaml       Render Blueprint
```
