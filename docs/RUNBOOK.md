# ResearchReel — Operations Runbook

Last updated: Nov 19, 2026 · @Goldy

This runbook documents production operations and incident response procedures for the ResearchReel platform hosted on Render, Cloudflare R2, PostgreSQL, and Redis.

---

## 1. Deploy Rollback Procedure

### Fast Rollback via Render Dashboard
1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Navigate to the affected service:
   - `researchreel-web` (Frontend Next.js)
   - `researchreel-api` (Express backend)
   - `researchreel-worker` (Background BullMQ worker)
   - `researchreel-rag` (FastAPI vector search)
3. Open the **Deploys** tab.
4. Locate the last known good deploy and click **Rollback to this deploy**.
5. Verify health:
   ```bash
   curl -sf https://<api-service>.onrender.com/api/v1/health
   curl -sf https://<web-service>.onrender.com/support
   ```

### Emergency Git Rollback
If a database migration or broken commit needs an immediate code revert:
```bash
# Revert the faulty commit on main
git checkout main
git pull origin main
git revert <faulty-commit-sha> -m 1
git push origin main
```

---

## 2. Secret Rotation Policy & Procedures

### A. Gemini API Key (`GEMINI_API_KEY`)
1. Create a new API key in [Google AI Studio](https://aistudio.google.com/).
2. In Render, update `GEMINI_API_KEY` in:
   - `researchreel-api`
   - `researchreel-worker`
   - `researchreel-rag`
3. Trigger a redeploy of the three services.
4. Once verified, revoke the old key in Google AI Studio.

### B. JWT Secret (`JWT_SECRET`)
> [!WARNING]
> Rotating `JWT_SECRET` invalidates all existing user session tokens, requiring all active users to sign in again.
1. Generate a secure 64-character secret:
   ```bash
   openssl rand -hex 32
   ```
2. Update `JWT_SECRET` in `researchreel-api` and `researchreel-worker`.
3. Flush Redis session cache to force clean token re-issue:
   ```bash
   # From Render Shell on researchreel-api:
   node -e "const r = require('./src/config/redisClient'); r.client.connect().then(() => r.client.flushDb().then(() => process.exit(0)))"
   ```

### C. Encryption Key (`ENCRYPTION_KEY`)
`ENCRYPTION_KEY` encrypts saved third-party credentials.
1. Ensure the new key is generated: `openssl rand -hex 32`.
2. Do not change `ENCRYPTION_KEY` directly without running a key re-encryption script if user-stored tokens exist.

### D. RAG Service API Key (`RAG_API_KEY`)
1. Generate a random 32-character token.
2. Update `RAG_API_KEY` on `researchreel-rag` and `researchreel-api`.
3. Redeploy `researchreel-rag`, then `researchreel-api`.

---

## 3. Database Backup & Restore

### Automated Point-in-Time Recovery (PITR)
On the Render `basic-1gb` database plan:
1. In Render Dashboard, click `researchreel-db`.
2. Open **Backups** tab.
3. Select the timestamp prior to data corruption or incident.
4. Click **Restore Backup to New Database**.
5. Once provisioned, update `DATABASE_URL` in `researchreel-api` and `researchreel-worker`.

### Manual Backup (CLI / Scripted)
```bash
# Export compressed PostgreSQL dump
pg_dump -Fc --no-acl --no-owner -d "$DATABASE_URL" -f "researchreel_backup_$(date +%Y%m%d_%H%M%S).dump"

# Upload to Cloudflare R2
aws s3 cp researchreel_backup_*.dump s3://$S3_BUCKET/backups/ --endpoint-url $S3_ENDPOINT
```

### Manual Restore
```bash
# Terminate existing connections and restore
pg_restore --clean --no-acl --no-owner -d "$NEW_DATABASE_URL" "researchreel_backup.dump"

# Verify migration state
node-pg-migrate status
```

---

## 4. Research RAG Re-indexing

When vector embeddings or chunking models change, or after restoring the PostgreSQL database, re-index documents:

```bash
# From the researchreel-api Shell on Render:
# 1. Re-index all processed documents into the RAG service:
npm run rag:reindex -- --all

# 2. Or re-index a single document by ID:
node src/scripts/ragReindex.js --id=<document-uuid>
```

---

## 5. Incident Triage & Quick Reference

| Issue | Quick Fix |
|---|---|
| **Email verification failing** | Temporarily set `REQUIRE_EMAIL_VERIFICATION=false` on `researchreel-api` to unblock sign-ups. |
| **Worker out of memory (OOM)** | In `researchreel-worker`, decrease BullMQ queue concurrency to `1` and limit `REEL_MAX_SECONDS=90`. |
| **Legitimate users receiving 429** | Verify `TRUST_PROXY_HOPS=2`. If an office/campus IP is throttled, temporarily raise `API_RATE_LIMIT=600`. |
| **Redis memory pressure** | Check Redis Key Value metrics. The maxmemory policy is `noeviction` (required by BullMQ). Clear expired OTP keys: `redis-cli del "otp:*"` |
| **YouTube reel fails to load** | Embed player will display "Open on YouTube" fallback button automatically. Verify client allows YouTube iframe embeds. |
