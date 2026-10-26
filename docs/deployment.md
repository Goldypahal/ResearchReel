# Deploying ResearchReel

ResearchReel runs as one Docker Compose stack behind an nginx gateway. Only the
gateway is published; Postgres, Redis, ClamAV, the RAG service, the API and the
worker stay on a private network.

| Service | Purpose |
| --- | --- |
| `gateway` | nginx: `/api`, `/socket.io`, `/uploads` → API; everything else → web |
| `web` | Next.js frontend |
| `api` | Express API (HTTP + websockets) |
| `worker` | Background jobs: video rendering (FFmpeg) and scheduled reel uploads |
| `migrate` | Applies database migrations, then exits; `api` and `worker` wait for it |
| `rag-service` | Paper ingestion and retrieval for the AI assistant |
| `clamav` | Malware scanning for every upload |
| `postgres`, `redis` | Data and cache/queues |

## Run it on one machine

```bash
cp .env.example .env        # fill in the required secrets (openssl rand -hex 32)
docker compose up --build -d
```

Open `PUBLIC_URL` (default `http://localhost:8080`). ClamAV needs a few minutes
to load signatures on first start; uploads are refused until it is ready rather
than accepted unscanned.

Email codes need SMTP settings in `.env`. Without them, production refuses to
send (the API returns an error instead of silently dropping the code).

## Automatic deploys from GitHub Actions

On every push to `main`, CI tests the backend and frontend, then publishes the
`api`, `rag` and `web` images to `ghcr.io/goldypahal/researchreel/*` tagged
with the commit SHA. The **Deploy** job then updates your server — but only
after you configure it:

1. **Prepare the server** (any Linux host with Docker Engine and the Compose plugin):

   ```bash
   sudo mkdir -p /opt/researchreel && sudo chown deploy: /opt/researchreel
   git clone https://github.com/Goldypahal/ResearchReel.git /opt/researchreel
   cd /opt/researchreel && cp .env.example .env   # fill it in; it never leaves the server
   ```

   Put TLS in front of the gateway (a cloud load balancer, or a reverse proxy
   such as Caddy) and set `PUBLIC_URL` to the `https://` address.

2. **Repository variables** (Settings → Secrets and variables → Actions → Variables):

   | Variable | Example |
   | --- | --- |
   | `DEPLOY_HOST` | `203.0.113.10` — setting this turns the deploy job on |
   | `DEPLOY_USER` | `deploy` |
   | `DEPLOY_PATH` | `/opt/researchreel` |
   | `PUBLIC_URL` | `https://researchreel.example.org` (baked into the web image) |
   | `SUPPORT_EMAIL`, `SENTRY_DSN`, `POSTHOG_KEY`, `POSTHOG_HOST` | optional |

3. **Repository secrets**:

   | Secret | Value |
   | --- | --- |
   | `DEPLOY_SSH_KEY` | Private key for `DEPLOY_USER` (add the public key to `~/.ssh/authorized_keys` on the server) |
   | `DEPLOY_KNOWN_HOSTS` | Optional: output of `ssh-keyscan -H <host>` to pin the host key |

The job checks out the commit on the server, pulls the matching images, runs
`docker compose up -d` (which applies migrations first) and waits for
`/api/v1/health` to return 200.

To roll back, re-run the Deploy job of an earlier successful workflow run.

## Health check

`GET /api/v1/health` returns `200` with `status: "UP"` or `"DEGRADED"` (an
optional service such as the RAG service is down) and `503` with
`status: "DOWN"` when Postgres or Redis is unreachable.
