# ResearchReel

A research-sharing platform: short video **reels** and posts about papers, an
AI assistant that answers questions grounded in the papers you choose,
**projects** with shared papers and task boards, scheduled **lectures** with
moderated Q&A, messaging, and verified **student** and **scholar** badges.

| Path | What it is |
| --- | --- |
| `frontend/` | Next.js 16 web app (TypeScript, Tailwind) |
| `backend/` | Express 5 API, Socket.IO, BullMQ worker, Postgres migrations |
| `backend/research_rag/` | FastAPI service for paper ingestion and retrieval |
| `gateway/` | nginx config: one public entry point for web + API |
| `docs/` | Architecture, specifications, deployment guide, generated schema |

## Run everything with Docker

```bash
cp .env.example .env        # fill in the required secrets (openssl rand -hex 32)
docker compose up --build -d
```

Then open <http://localhost:8080>. Migrations run automatically before the API
starts. See [docs/deployment.md](docs/deployment.md) for production and the
GitHub Actions deploy.

## Develop locally

You need Node 20+, PostgreSQL 14+ and Redis 7.

```bash
# API (http://localhost:5000, API docs at /api-docs)
cd backend
cp .env.example .env              # set DATABASE_URL, JWT_SECRET and ENCRYPTION_KEY
npm install
npm run migrate -- up -m migrations
npm run seed                      # optional demo accounts, development only
npm run dev

# Web app (http://localhost:3000)
cd frontend
cp .env.example .env.local
npm install
npm run dev

# Optional: RAG service for the AI assistant (http://localhost:8000)
cd backend/research_rag
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

Without SMTP settings, development prints email verification and password-reset
codes to the API log. The demo seed creates accounts such as
`albert@princeton.edu` with the password `Science123!`; it refuses to run with
`NODE_ENV=production`.

## Checks

```bash
cd backend && npm test                                   # API tests
cd frontend && npm run lint && npx tsc --noEmit && npm run build
```

CI runs these plus dependency audits and a from-scratch migration check on
every pull request.

## Configuration

- [`.env.example`](.env.example) — Docker Compose settings
- [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example) — local development
- [docs/api-keys.md](docs/api-keys.md) — where to get third-party keys (Gemini, ORCID, Stripe, SMTP…)
