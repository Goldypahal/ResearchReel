# ResearchReel — Security, Compliance & Cryptography Architecture

This document specifies the security controls, data encryption rules, JWT session details, and network policies for ResearchReel V1.0 Enterprise.

---

## 1. Network & API Security Layer
* **Cloudflare WAF**: Filters incoming web requests to block SQL injection and cross-site scripting (XSS) patterns. Enforces rate limits at the edge.
* **API Gateway Route Limits**:
  * Core APIs: 150 requests per 15 minutes.
  * AI/RAG routes: 20 requests per hour.
  * Registration/OTP routes: 5 requests per hour.

---

## 2. Authentication & JWT Strategy
* **Secure Cookies**: User JWT tokens are returned inside secure `HttpOnly`, `SameSite=Strict`, `Secure` cookies to block XSS token extraction.
* **Token Expiration**: Access tokens expire in 15 minutes. Refresh tokens are stored in the database with 30-day rotations.
* **Argon2id Hashing**: User passwords are encrypted using Argon2id with 3 passes, 64MB memory parameters, and salt buffers.

---

## 3. Data Encryption & Secrets
* **Encryption at Rest**: PostgreSQL database clusters utilize AES-256 transparent data encryption. S3 buckets require KMS-managed keys.
* **Encryption in Transit**: All public traffic is forced to use TLS 1.3. Internal service gRPC routes run inside VPC limits using TLS certificates.
* **Secrets Management**: Credentials (keys, DB connection strings, Stripe secrets) are injected at runtime via Kubernetes Secrets.

---

## 4. File Upload Security
1. **Presigned URLs**: Clients obtain pre-signed S3 links, restricting S3 write operations to 5-minute windows.
2. **Buffer Verification**: Worker pipelines run MIME-type verification on file buffers to block masqueraded scripts.
3. **ClamAV Anti-Virus Scan**: Staged uploads are scanned by ClamAV microservice containers. Files flagged as threats are deleted immediately.
