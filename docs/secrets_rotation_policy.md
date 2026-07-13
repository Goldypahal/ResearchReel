# ResearchReel — Secrets Rotation Policy

This policy outlines how API keys, database credentials, and signing secrets are managed and rotated in the ResearchReel platform.

---

## 1. Scope & Roles
This policy applies to all environments (development, staging, production) and covers:
- Database credentials (Postgres, Redis)
- JWT signing keys (`JWT_SECRET`)
- Third-party API keys (Sentry, PostHog, Gemini/Cohere API keys)
- SMTP/Nodemailer email configurations

---

## 2. Secrets Storage
1. **No Hardcoding**: Secrets must never be stored in Git.
2. **Environment Variables**: Use Render/Railway environment variables or AWS Secrets Manager.
3. **Local Development**: Utilize `.env` files which are added to `.gitignore`.

---

## 3. Rotation Schedule
Secrets must be rotated under the following schedule:

| Secret Type | Schedule | Responsibility |
|---|---|---|
| **JWT Signing Key** | Every 180 Days | DevOps/Tech Lead |
| **PostgreSQL Password** | Every 180 Days or on developer exit | Database Admin |
| **Redis Password** | Every 180 Days or on developer exit | Database Admin |
| **Third-Party API Keys** | Annually | Tech Lead |
| **SSL/TLS Certificates** | Automated via Let's Encrypt (90-day auto-renew) | Platform/Hosting |

---

## 4. Emergency Rotation Procedure
In the event of a suspected leak or security breach:
1. Revoke the compromised credential immediately from the provider's panel.
2. Generate a new secret using a secure random generator:
   ```bash
   openssl rand -hex 32
   ```
3. Update the environment variables in the hosting provider's panel (Render/Railway/Vercel).
4. Perform a zero-downtime rolling restart of the backend service.
5. Invalidate active user sessions if the `JWT_SECRET` was leaked by rotating the secret, forcing all users to re-login.
