# Deploying ResearchReel

The repo includes a Render Blueprint (`render.yaml`) that creates everything in one go:

| Resource | Render type | Plan in blueprint | Notes |
|---|---|---|---|
| `researchreel-db` | PostgreSQL 16 | basic-256mb | Data |
| `researchreel-redis` | Key Value | starter | Sessions, rate limits, job queue (`noeviction`) |
| `researchreel-api` | Web service (Docker) | starter + 10 GB disk | API, websockets, reel worker, FFmpeg; runs migrations on start |
| `researchreel-web` | Web service (Node) | starter | Next.js app; proxies `/api`, `/uploads`, `/socket.io` to the API privately |

Paid instance types are needed because the API uses a persistent disk and the services talk over Render's private network. At the time of writing this costs about $7/month per web service plus the database and Key Value plans; check Render's pricing page.

## 1. Before you start

Have these ready (all optional except where noted):

- **SMTP credentials** for sending verification codes. Any provider works: Resend, SendGrid, Brevo, Mailgun, or a Gmail app password. If you don't have one yet, deploy with `REQUIRE_EMAIL_VERIFICATION=false` and turn it on later.
- **Gemini API key** (https://aistudio.google.com/) to enable AI answers, summaries, AI-written reel scripts and narration. Without it, everything else works and the AI pages say AI isn't enabled.
- A **custom domain** (optional).

## 2. Create the Blueprint

1. In Render: **New → Blueprint**, connect the `ResearchReel` GitHub repo, branch `main`.
2. Render reads `render.yaml` and asks for the `sync: false` values. Enter:
   - `FRONTEND_URL`: `https://researchreel-web.onrender.com` (the web service's URL; adjust if Render gives it a different name, or use your custom domain)
   - `NEXT_PUBLIC_UPLOAD_URL`: `https://researchreel-api.onrender.com` (the API's public URL; lets large uploads skip the web server)
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`: your email provider's details (leave blank if you set `REQUIRE_EMAIL_VERIFICATION=false`)
   - `GEMINI_API_KEY`: optional
   - `CROSSREF_MAILTO`, `NEXT_PUBLIC_SUPPORT_EMAIL`: optional, your contact email
3. Click **Apply**. The first deploy takes a few minutes: the API image installs FFmpeg, and the web app builds.

`JWT_SECRET` and `ENCRYPTION_KEY` are generated automatically. Never change `ENCRYPTION_KEY` after launch, or users' saved API keys become unreadable.

> **If Render named a service differently** (e.g. `researchreel-web-abcd`), update `FRONTEND_URL` and `NEXT_PUBLIC_UPLOAD_URL` to the real URLs. Then redeploy the web service, because `NEXT_PUBLIC_*` values are baked in at build time.

## 3. Create your admin account

Open the API service → **Shell** and run:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-unique-password' ADMIN_USERNAME=admin npm run seed
```

Sign in at the web URL; **Moderation** appears in the sidebar. You can promote other users to moderator from there.

## 4. Check it works

- `https://<api>.onrender.com/api/v1/health` should return `"status": "UP"`. It also reports whether AI and email are configured.
- Sign up with a real email address and confirm the code arrives.
- Post an image, upload a PDF, upload a short video and generate a reel from the PDF (you'll get a notification when it's ready).
- Open the site in two browsers and send a message to confirm live delivery.

## 5. Custom domain (optional)

1. Add the domain to **researchreel-web** (Settings → Custom Domains) and follow the DNS instructions.
2. Set the API's `FRONTEND_URL` to `https://yourdomain.com`. You can list several, comma separated.
3. Optionally add `api.yourdomain.com` to **researchreel-api**, set `NEXT_PUBLIC_UPLOAD_URL` to it, and redeploy the web service.

## Operations

- **Migrations** run automatically every time the API starts. To add one: `cd backend && npm run migrate:create -- my-change`.
- **Backups**: Render backs up paid Postgres plans daily. Uploaded files live on the API's disk (`/app/public/uploads`); Render snapshots disks daily. For larger scale, set the `S3_*` variables to use S3 or Cloudflare R2 instead. New files go there, so do this before launch if you can.
- **Scaling**: a persistent disk limits the API to one instance. To run several, switch to S3 storage, remove the disk, and optionally run the worker separately (`START_WORKER=false` on the API, plus a background worker running `node src/worker.js`).
- **Logs**: both services log to Render's log stream; the API logs HTTP requests and errors with request IDs.
- **Rate limits**: 300 requests/minute per IP overall, with tighter limits on sign-in, sign-up, uploads and AI (`AI_DAILY_LIMIT` per user per day).

## Other hosts

Anything that runs Docker works. `docker-compose.yml` runs the whole stack on one server:

```bash
cat > .env <<EOF
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
FRONTEND_URL=https://yourdomain.com
REQUIRE_EMAIL_VERIFICATION=false
EOF
docker compose up -d --build
```

Put a reverse proxy with TLS (Caddy, nginx, Traefik) in front of port 3000. Only the web app needs to be public.
