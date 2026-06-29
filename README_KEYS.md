# 🔑 ResearchReel API & Keys Guide

To make the platform fully functional, you need to obtain the following API keys. Most of these have generous free tiers for research and development.

---

### 📧 0. Email Verification (OTP) - NEW
*   **Purpose**: Sending 6-digit codes during registration and login.
*   **Method**: SMTP (Gmail, Outlook, or Resend).
*   **Variables**:
    *   `EMAIL_USER`: Your email address (e.g., `researchreel@gmail.com`)
    *   `EMAIL_PASS`: Your **App Password** (Not your regular password! [Get Google App Password](https://myaccount.google.com/apppasswords))

---

### 1. 🤖 Artificial Intelligence (RAG & Chat)
*   **Google AI (Gemini) API**
    *   **Purpose**: Powers "Ask Gemini," paper summarization, and RAG.
    *   **Where to get**: [Google AI Studio](https://aistudio.google.com/)
    *   **Cost**: Free (within rate limits).
    *   **Variable**: `GEMINI_API_KEY` in `backend/.env`

*   **Qdrant Cloud**
    *   **Purpose**: Vector database for storing research paper "memory."
    *   **Where to get**: [Qdrant Cloud](https://cloud.qdrant.io/)
    *   **Cost**: Free Tier available (1 cluster).
    *   **Variables**: `QDRANT_URL`, `QDRANT_API_KEY`

---

### 2. 🎓 Academic Verification
*   **CrossRef API**
    *   **Purpose**: To verify DOIs and fetch paper metadata.
    *   **Where to get**: No key required, but you should provide a "mailto" email in the headers.
    *   **Variable**: `NEXT_PUBLIC_CROSSREF_MAILTO` in `frontend/.env.local`

*   **ORCID API**
    *   **Purpose**: Verify "Verified Scholar" status and institutional affiliations.
    *   **Where to get**: [ORCID Developer Tools](https://orcid.org/developer-tools) (Register a Public Client).
    *   **Variables**: `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET`

---

### 3. ☁️ Storage & Database
*   **AWS S3 / Firebase Storage**
    *   **Purpose**: Hosting research PDFs, images, and user avatars.
    *   **Where to get**: [AWS Console (S3)](https://aws.amazon.com/s3/) or [Firebase Console](https://console.firebase.google.com/).
    *   **Variables**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`

*   **Supabase / Managed Postgres**
    *   **Purpose**: Core database for users, posts, and leaderboards.
    *   **Where to get**: [Supabase](https://supabase.com/) or [Vercel Postgres](https://vercel.com/storage/postgres).
    *   **Variable**: `DATABASE_URL`

---

### 4. 💬 Communication
*   **Pusher** (Recommended for real-time)
    *   **Purpose**: Instant messaging and live notifications.
    *   **Where to get**: [Pusher Channels](https://pusher.com/channels).
    *   **Variable**: `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`

---

### 🚀 Implementation Checklist:
1. [ ] Copy `frontend/.env.local` to a new file named `.env` in the same folder.
2. [ ] Fill in your `GEMINI_API_KEY` in `backend/.env`.
3. [ ] Set up a Supabase project and paste the connection string into `DATABASE_URL`.
4. [ ] Restart both dev servers: `npm run dev`.

---
*Note: Never commit your real `.env` files to GitHub. They are ignored by the `.gitignore` for your security.*
