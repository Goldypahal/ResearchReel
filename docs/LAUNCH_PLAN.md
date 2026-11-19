# ResearchReel — 1-Month Launch Implementation Plan

Nov 19, 2026 · @Goldy

## Summary

ResearchReel goes public on **Tuesday 15 December 2026**, after four weeks: security fixes, then hardening, then a closed beta, then launch. The product itself is built: CI was green on the last commit (13 Nov), the screens use real data, and the Render Blueprint deploys the whole stack. What stands in the way is a short list of security and operations gaps found in the 19 Nov review.

**Update, 19 Nov afternoon:** Research Picks is built and ready to merge (`research-picks.patch`, 2 commits, tests passing). It adds about 6,000 YouTube talks and lectures to Reels. Each plays as a 60-second preview, with a full player at `/watch/<id>`. An open-media dataset of 26,656 licence-tagged videos and papers is also ready for later. This plan now merges Picks in Week 1, tests it on staging in Week 2 and puts it in front of beta users in Week 3. The rest of the dataset waits until after launch.

**Biggest blockers going in**

- A real Gemini API key, a Qdrant key and an old JWT secret are still readable in the public repo's history (commit `cc80572`, `k8s/secrets.yml`).
- The rate limiter never blocks anything. A crash in `backend/src/middleware/rateLimiter.js` (the undefined `ip` variable) lets every request through. That leaves login, sign-up, password reset, uploads and AI open to abuse.
- Behind the Next.js proxy the API probably sees every visitor as the same IP. Once rate limiting works, that would lock everyone out at the same time.
- The frontend has 1 critical (`@sentry/nextjs`) and 1 high (`axios`) dependency vulnerability, and there's no error monitoring in production.

**Assumptions:** one developer working full time, about 6 hours a day. Hosting stays on Render, using `render.yaml`. Week 1 runs Thu 19 Nov to Wed 25 Nov, and each later week runs Thursday to Wednesday. The last week stretches to Fri 18 Dec for the post-launch watch.

Each week ends at a gate. Don't start the next week's work until the gate is met.

## Week 1 · 19–25 Nov: Close the security holes

Goal: by Wednesday nothing exploitable is left, and rate limiting is proven to work with a test.

**Day 1 (Thu 19 Nov): leaked secrets**

- [ ] Revoke the Gemini key `AIzaSyA6no…` in Google AI Studio and create a new one. Store it only in Render and a password manager.
- [ ] Revoke the Qdrant API key from `k8s/secrets.yml` (or delete the Qdrant cluster if it isn't used anymore).
- [ ] Check the Google Cloud billing and usage for that key since June, and set a budget alert.
- [ ] Optional: remove the old secrets from git history with `git filter-repo`, then force-push. Only revoking actually protects you, because forks and caches keep the old commits.
- [ ] Turn on GitHub secret scanning and push protection (Settings → Code security).

**Day 2 (Fri 20 Nov): fix the rate limiter**

- [x] In `backend/src/middleware/rateLimiter.js`, replace `${ip}` with `${who}`, and switch `console.warn` to the shared `logger`.
- [x] Make the limiter testable: skip it only when `DISABLE_RATE_LIMIT=true`, not whenever `NODE_ENV=test`.
- [x] Add `backend/tests/rateLimit.test.js`. With a limit of N, request N+1 must get a 429, and login must lock after 20 tries in 15 minutes.
- [x] Use `INCR` + `EXPIRE` in one `MULTI` so a crash can't leave a key with no expiry.

**Day 3 (Mon 23 Nov): real client IP behind the proxy**

- [ ] Log `req.ip` and the raw `X-Forwarded-For` on a test endpoint, deploy to a throwaway Render service, then call it from two different networks (Wi-Fi and phone data).
- [x] If both show the same IP, set `TRUST_PROXY_HOPS` to match the number of hops (probably 2). Document it in `DEPLOYMENT.md` and `render.yaml`.
- [x] Socket.io: check that its connection rate limit uses the same client IP.

**Day 4 (Tue 24 Nov): dependencies and CI**

- [x] Run `npm audit fix` in `frontend/` (fixes `@sentry/nextjs` and `axios`), then rebuild and run the e2e tests.
- [x] Add `npm audit --omit=dev --audit-level=high` to the frontend CI job, plus `pip-audit` to the RAG job.
- [x] Turn on Dependabot for npm, pip, Docker and GitHub Actions.
- [ ] Merge Research Picks: run `git am research-picks.patch` on a `feature/research-picks` branch, open a PR and merge once CI is green. It adds one migration and no new environment variables.

**Day 5 (Wed 25 Nov): authentication review**

- [x] Lock an account for 15 minutes after 10 failed logins (a Redis counter per email), and tell the user by email.
- [x] Make password reset and "resend code" give the same response whether or not the email exists.
- [x] Pass `algorithms: ['HS256']` to every `jwt.verify` call (3 places).
- [x] Make `ENCRYPTION_KEY` required in production (right now it falls back to `JWT_SECRET`).
- [ ] Tag release `v0.9.0-security`.

**Done when:** CI is green with the new rate-limit tests, the old keys are revoked, and `npm audit` shows no high or critical issues in any package.

## Week 2 · 26 Nov – 2 Dec: Production infrastructure and monitoring

Goal: a staging copy of production runs on Render, stores files in object storage, and reports every error.

**Day 6 (Thu 26 Nov): object storage**

- [ ] Create a Cloudflare R2 bucket (free egress) with a public custom domain such as `media.yourdomain.com`.
- [ ] Set the `S3_*` variables. Upload a post image, a PDF and a video, and check that all three load from R2.
- [ ] Remove the 10 GB `uploads` disk from the API in `render.yaml`. With no disk, the API can run more than one instance.

**Day 7 (Fri 27 Nov): split the worker out**

- [x] Add a Render Background Worker in `render.yaml` that runs `node src/worker.js`, and set `START_WORKER=false` on the API.
- [x] Give the worker at least 2 GB RAM, since FFmpeg renders reels there. Leave the API on starter, or standard if memory gets tight.
- [ ] Render a 3-minute reel and watch memory in Render's metrics. Lower the BullMQ worker concurrency to 1 if it climbs above 80%.

**Day 8 (Mon 30 Nov): error monitoring and uptime**

- [ ] Create a Sentry project. Set `NEXT_PUBLIC_SENTRY_DSN` on the web service, and add `@sentry/node` to the API and worker.
- [ ] Set up uptime checks (Better Stack or UptimeRobot, free tier) on `/api/v1/health` and the home page, with alerts to your phone.
- [ ] Make sure logs show request IDs, and that they never contain passwords, sign-up codes or tokens.

**Day 9 (Tue 1 Dec): deploy staging**

- [ ] Create a `staging` branch and deploy a copy of the Blueprint from it (`researchreel-staging-*` services).
- [ ] Go through section 4 of `DEPLOYMENT.md` on staging: health check, PDF indexing, AI answers, a generated reel, live messages and email.
- [ ] Run `ADMIN_EMAIL=… npm run seed`, then check that the moderation console works.
- [ ] Run `npm run import:picks` in the staging API's Shell (about 6,000 picks, takes under a minute).
- [ ] Play picks on desktop Chrome, iPhone Safari and Android Chrome. Check the preview starts muted, loops after 60 seconds, pauses on tap and unmutes. "Watch full video" should continue from the same moment.
- [ ] Turn on an ad blocker (uBlock Origin) and check that the "Open it on YouTube" fallback appears if YouTube's player is blocked.

**Day 10 (Wed 2 Dec): backups and recovery**

- [x] Move Postgres to a plan with point-in-time recovery (Render basic-1gb or higher), or schedule a nightly `pg_dump` to R2.
- [ ] Rehearse a restore: restore last night's backup into a new staging database and log in.
- [x] Write a one-page runbook in `docs/RUNBOOK.md`: how to roll back a deploy, rotate a secret, restore the database and re-index the RAG service.

**Done when:** staging runs on R2 with a separate worker, errors show up in Sentry, uptime alerts reach your phone, and a database restore has worked once.

## Week 3 · 3–9 Dec: Legal, email, load testing and closed beta

Goal: 20–30 real researchers use staging for five days, and every bug that blocks them gets fixed.

**Day 11 (Thu 3 Dec): legal and trust pages**

- [x] Turn the short Terms and Privacy sections on `/support` into separate `/terms` and `/privacy` pages. Start from the drafts in `docs/archive/planning/`.
- [x] Cover the data you collect, your AI processor (Google Gemini) and where data is stored. Also cover how long you keep it, how to delete an account, and India's DPDP Act 2023 plus GDPR if EU users can sign up.
- [x] Add a copyright takedown contact. Users upload papers, and many are under publisher copyright.
- [x] Add a section on embedded content. Research Picks play from YouTube under YouTube's terms and belong to their channels, and you remove any on request (Report button or support email). The privacy page should say that YouTube receives viewer data when a pick plays. The Help page already says this.
- [x] Show "By signing up you agree to the Terms and Privacy Policy" on the sign-up page, and record the time each user accepted.
- [ ] Decide whether `docs/archive/` (due-diligence report, SRS) should stay in a public repo. If not, move it to a private one.

**Day 12 (Fri 4 Dec): email delivery**

- [ ] Verify your sending domain in Resend and add SPF, DKIM and DMARC records.
- [ ] Use [mail-tester.com](https://www.mail-tester.com) to score the sign-up code, password reset and comment emails. Aim for 9/10 or better.
- [ ] Test with Gmail, Outlook and a university address (spam filters there are strict).
- [ ] Check the one-click unsubscribe from Gmail's own button.

**Day 13 (Mon 7 Dec): load and abuse testing**

- [ ] Run `backend/load-tests/k6_load_test.js` against staging: 200 virtual users for 10 minutes on the feed, search, login and an AI call.
- [ ] Targets: p95 under 500 ms on the feed and under 1 s on search, an error rate under 1%, and the database pool never saturated.
- [ ] Abuse checks: hammer the login endpoint (expect a 429 after 20 tries), upload a 300 MB file (rejected), upload an `.exe` renamed to `.pdf` (rejected), and open another user's private project by ID (403).
- [ ] Add any missing database indexes the slow-query log points to.

**Day 14 (Tue 8 Dec): start the closed beta**

- [ ] Invite 20–30 people: lab mates, your professors' groups, researcher friends on X or LinkedIn.
- [ ] Give them a 5-minute task list: sign up, upload a paper, ask the AI a question, make a reel, watch 3 Research Picks and open one in full, follow 3 people, comment.
- [ ] Collect feedback through a Google Form linked from the Help page, plus a WhatsApp or Discord group.

**Day 15 (Wed 9 Dec): triage**

- [ ] Sort every bug into blocker, must-fix or after launch. Fix the blockers the same day.
- [ ] Look at Sentry's top 10 errors and the failed jobs in BullMQ.
- [ ] Check Gemini spending per active beta user and set `AI_DAILY_LIMIT` so a heavy user can't cost more than about $1/day.
- [ ] Check how beta users use Research Picks: how often a preview leads to "Watch full video", and which subjects get scrolled past. Hide weak picks from the moderation console, or prune the list and re-import with `npm run import:picks -- --prune`.

**Done when:** the beta has been running for 2+ days with no open blockers, legal pages are live, and emails reach Gmail and Outlook inboxes rather than spam.

## Week 4 · 10–18 Dec: Production deploy, launch and watch

Goal: launch publicly on Tue 15 Dec, then keep the site stable for the following 72 hours.

**Day 16 (Thu 10 Dec): fix the beta's must-fix bugs**

- [ ] Fix every bug marked must-fix. Anything unfinished by tonight moves to after launch.
- [ ] Code freeze at the end of the day. After this, only fixes for blockers get merged.

**Day 17 (Fri 11 Dec): production deploy**

- [ ] Create the production Blueprint from `main`, with new secrets that were never used on staging.
- [ ] Connect your custom domain, then set `FRONTEND_URL`, `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_UPLOAD_URL`, and redeploy the web service.
- [ ] Create the admin account and at least one moderator besides you.
- [ ] Run `npm run import:picks` in the production API's Shell.
- [ ] Make a soft-launch smoke test: go through the Done-when checks from Weeks 1–3 again, this time in production.

**Day 18 (Mon 14 Dec): seed content and prepare the launch**

- [ ] Invite the beta users to sign up on production (staging data doesn't carry over). Aim for 30+ real posts so the home feed isn't empty. Research Picks already fill Reels, but 10+ community reels make For you feel alive.
- [ ] Write the launch posts: X, LinkedIn, r/academia or r/PhD (check their self-promotion rules), lab mailing lists and Product Hunt (schedule for 12:01 PT).
- [ ] Prepare a 60-second demo reel made with ResearchReel itself.
- [ ] Check that link previews look right in WhatsApp, Slack, X and LinkedIn.

**Day 19 (Tue 15 Dec): launch day**

- [ ] Final go/no-go check against the checklist below, in the morning.
- [ ] Publish the launch posts. Reply to every comment for the first 6 hours.
- [ ] Watch Sentry, Render metrics, Redis memory, the BullMQ queue and Gemini spending every hour.
- [ ] Rollback plan: Render's Rollback button for a bad deploy, or set `REQUIRE_EMAIL_VERIFICATION=false` if email delivery fails.

**Days 20–21 (Wed 16 – Fri 18 Dec): watch and fix**

- [ ] Fix production bugs the same day. Ship small patches, never a big batch.
- [ ] Review the moderation queue twice a day.
- [ ] Measure: sign-ups, how many verify their email, how many upload a paper in their first day, and the Day-1 return rate.
- [ ] Write a short launch retro and pick the next month's priorities from the feedback.

## Launch go/no-go checklist

Launch on 15 Dec only if every **Must** item is checked. If a **Should** item isn't done, launch anyway and note it in the retro.

**Must**

- [ ] The leaked Gemini and Qdrant keys are revoked, and production uses only newly generated secrets
- [ ] Rate limiting returns 429 in production (checked by hand), and the API sees each visitor's real IP
- [ ] `npm audit` shows no high or critical issues in the backend or frontend, and CI is green on the commit being deployed
- [ ] Sentry receives errors from the web app, the API and the worker, and uptime alerts reach your phone
- [ ] A database backup has been restored once successfully
- [ ] Sign-up codes reach Gmail and Outlook inboxes rather than spam
- [x] `/terms` and `/privacy` are live and linked from the sign-up page
- [ ] No open blocker bugs from the beta
- [ ] Accessing another user's private project, document or message by ID returns 403
- [ ] An admin and a second moderator can sign in to the moderation console

**Should**

- [x] Files are stored in R2 and the worker runs as its own service (Blueprint configured)
- [ ] The load test meets its targets (feed p95 under 500 ms, error rate under 1%)
- [x] `AI_DAILY_LIMIT` is set and a Gemini billing alert is active
- [x] Accounts lock after 10 failed logins
- [x] The runbook exists in `docs/RUNBOOK.md`
- [ ] Link previews look right in WhatsApp, X and LinkedIn
- [ ] Research Picks are imported in production and play on iPhone and Android, with the preview looping and "Watch full video" working
- [x] HackerTube is credited on the Help page, and the Terms cover embedded YouTube content

## Risks, budget and deferred work

**Risks**

| Risk | Likelihood | Fallback |
| --- | --- | --- |
| Beta finds more blockers than fit in Week 4 | Medium | Move launch to Tue 22 Dec. Never cut the security items. |
| Gemini costs spike on launch day | Medium | Lower `AI_DAILY_LIMIT`, set a hard billing cap, and say AI is "busy" rather than failing |
| Emails land in university spam folders | Medium | Show the sign-up code resend option clearly, and temporarily allow `REQUIRE_EMAIL_VERIFICATION=false` |
| FFmpeg reel rendering runs out of memory | Medium | Concurrency 1 on the worker, lower `REEL_MAX_SECONDS` to 90 |
| YouTube videos get deleted or have embedding turned off | Medium, slowly over time | The reel shows an "Open it on YouTube" link. Re-check monthly and run `npm run import:picks -- --prune` |
| Ad blockers or school networks block YouTube | Medium | Picks fall back to the YouTube link. Community reels play from your own storage and aren't affected |
| A channel asks for its video to be removed | Low | Moderator deletes the pick, and it stays deleted on re-import |
| Copyright complaints about uploaded papers | Low–Medium | Takedown contact on `/terms`, and moderators remove the paper within 48 h |
| RAG service down (it runs as a single instance) | Low | The API already falls back to sending full text to Gemini |

**Monthly hosting budget (approximate; check Render's pricing page)**

| Item | Plan | Approx. USD/month |
| --- | --- | --- |
| Web app | Render starter | 7 |
| API | Render starter | 7 |
| Worker (FFmpeg) | Render standard, 2 GB | 25 |
| Research RAG | Render standard, 2 GB | 25 |
| PostgreSQL | basic-1gb, with recovery | about 20 |
| Redis (Key Value) | starter | about 10 |
| R2, Sentry, uptime checks | free tiers at launch scale | 0–5 |
| Gemini API | pay per use | depends on traffic; cap it |
| **Total, before Gemini** |  | **about 95–100** |

Staging costs about the same while it runs, so suspend its services after launch week.

**Deferred until after launch (January)**

- ClamAV malware scanning (needs its own 2 GB service)
- Running more than one API instance, and Socket.io across instances via the Redis adapter
- Native mobile apps, payments and billing
- An outside security review or pentest once you have real users
- Removing the old secrets from git history, if you skipped it in Week 1
- Moderator-set preview starts for the most-watched picks, so the 60 seconds land on the best part rather than the 10% rule
- Importing the downloadable part of the open-media dataset: 8,877 clips that can be edited and used commercially (NASA, Wikimedia, Internet Archive, CC BY YouTube), stored in R2 with credit on every reel
- Generating reels from the 11,555 open-licence arXiv and PLOS papers in the dataset
- Pexels and Pixabay B-roll for generated reels, and a monthly YouTube Data API refresh of the picks (add API keys to `collect_media.js`)
