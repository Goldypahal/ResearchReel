# ResearchReel

A social platform for research. People share findings as posts, papers and short video reels, follow each other, discuss, collaborate on projects, host live lectures, and ask an AI assistant about papers.

## Features

- **Accounts**: email sign-up with a verification code, password reset, session management, ORCID-verified researcher badges
- **Feed**: posts with text, images or a PDF paper; likes, comments, bookmarks, #tags and @mentions; "Following" and "Everyone" feeds; 24-hour stories
- **Reels**: vertical video feed; upload your own video, or generate an explainer reel from a paper (script → editable scenes → rendered MP4 with optional AI narration)
- **Library**: upload PDFs (text is extracted for search and AI), or import publications by DOI or ORCID via Crossref
- **AI assistant** (optional, Gemini): ask questions grounded in a paper's full text, summaries, conversation history
- **Messages**: direct messages with live delivery, unread counts and typing indicators
- **Notifications**: follows, likes, comments, mentions, project invites, lectures, reel processing, all live
- **Projects**: members and roles, drag-and-drop task boards, shared papers; a "My tasks" board across projects
- **Lectures**: schedule or go live, registration with a private meeting link, live discussion
- **Discovery**: search (people, papers, posts, reels, tags), discover, explore, conference deadline tracker, leaderboard, achievements
- **Moderation**: reporting, moderator console (reports, users, suspensions, roles), audit log

## Architecture

```
Browser ──► Next.js web app (frontend/) ──proxy /api, /uploads, /socket.io──► Express API (backend/)
                                                                               │  ├─ PostgreSQL (data)
Large uploads (optional) ─────────── direct to API with upload token ──────────┤  ├─ Redis (sessions, rate limits, jobs, realtime)
                                                                               │  ├─ BullMQ worker + FFmpeg (reels)
                                                                               │  ├─ Disk or S3-compatible storage (files)
                                                                               │  └─ Gemini API (optional AI)
```

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

Open http://localhost:3000 and create an account. Without SMTP configured, the verification code is printed in the backend console. To skip email verification locally, set `REQUIRE_EMAIL_VERIFICATION=false` in `backend/.env`.

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
```

Backend tests create a throwaway `researchreel_test` database. Point them elsewhere with `TEST_DATABASE_URL` and `TEST_REDIS_URL`. CI runs everything on every push (`.github/workflows/ci.yml`).

## Deploy

See **[DEPLOYMENT.md](DEPLOYMENT.md)**. It's a one-click Render Blueprint (`render.yaml`) plus a checklist of the settings you need to fill in.

## Configuration

All backend settings are documented in [`backend/.env.example`](backend/.env.example) and frontend settings in [`frontend/.env.example`](frontend/.env.example). The important ones:

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` | API | Required |
| `FRONTEND_URL` | API | Public URL of the web app (CORS, email links) |
| `SMTP_*`, `EMAIL_FROM` | API | Sending verification codes and reset links |
| `REQUIRE_EMAIL_VERIFICATION` | API | Set `false` to allow sign-up without email |
| `GEMINI_API_KEY` | API | Turns on AI features (optional) |
| `S3_*` | API | Store files in S3/R2 instead of local disk (optional) |
| `BACKEND_URL` / `BACKEND_HOSTPORT` | Web (build) | Where the web app proxies the API |
| `NEXT_PUBLIC_UPLOAD_URL` | Web (build) | Public API URL for direct large uploads (recommended) |

## Project layout

```
backend/
  src/            Express app: routes → controllers → services; socket.io; BullMQ worker
  migrations/     node-pg-migrate schema migrations (run automatically in Docker)
  tests/          integration tests (Postgres + Redis)
  research_rag/   experimental Python RAG service (not used by the app or deployment)
frontend/
  src/app/        Next.js App Router pages
  src/components/ UI components
  src/lib/api/    typed API client
docs/             architecture notes; docs/archive holds the original planning documents
render.yaml       Render Blueprint
```
