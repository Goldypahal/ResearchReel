# ResearchReel — Current Product Analysis & Reverse Engineering Assessment (V0.1 MVP)

This document provides a comprehensive reverse-engineered assessment of the ResearchReel MVP (V0.1). It captures the product vision, catalogs the current pages, APIs, database tables, component structures, and state management strategies, and identifies critical technical debt, security issues, and scaling bottlenecks.

---

## 1. Product Vision & Target Audience
ResearchReel is designed to bridge the gap between academic publication silos and modern, engaging, mobile-first scientific discovery. The vision is to merge Instagram-style engagement patterns (vertical micro-video reels, academic reactions, real-time feedback loops) with RAG-based document interrogation and collaborative project workspaces.
* **Target Audience**: Verified PhD/Academic scholars (ORCID verified), college/university students (academic email domain verified), and the general public interested in digestible research updates.

---

## 2. Existing Features Inventory
The current V0.1 MVP implements the following core features:
* **Academic Authentication**: Email/password authentication combined with a 6-digit OTP verification flow.
* **Research Feed**: A central page displaying user posts that handle Markdown content, custom LaTeX rendering, and paper document attachments.
* **Multidimensional Academic Reactions**: Toggles to react to posts with specialized identifiers (🤔 Interesting, 💡 Novel, ⚠️ Needs Discussion).
* **AI Reels Draft Studio**: Parses PDFs uploaded to the workspace and automatically designs a 4-scene video script using Gemini models.
* **AI Document Q&A (RAG)**: A floating query interface powered by FastAPI, allowing users to ask questions grounded in uploaded paper context.
* **Project Workspaces**: Kanban task management board and LaTeX document version tracking.
* **Real-time Messaging**: Direct and group messaging utilizing Socket.IO.

---

## 3. Existing Page Inventory (Next.js App Router)
The frontend uses Next.js App Router with the following active folders and routes:
* **Landing Portal (`/`)**: Introduces the platform, features, and prompts authentication.
* **Authentication Paths (`/auth`)**:
  * `/auth/login` - Login card interface.
  * `/auth/register` - Account signup interface.
  * `/auth/verify` - OTP submission form.
  * `/auth/forget-password` - Email recovery interface.
* **Home Feed (`/home`)**: Standard feed displaying posts, attachments, comment triggers, and bookmark actions.
* **Reels Interface (`/reels`)**: Vertical HLS scroll viewer with floating overlay details and citation links.
* **Creator Workspace (`/create` & `/editor/[draft_id]`)**: PDF file selection, drag-and-drop scene editor, voice synthesis selection.
* **Collaboration Center (`/projects` & `/workspace/[id]`)**: Kanban board workspace.
* **Document Viewer (`/document/[id]`)**: In-app PDF viewer with the "Ask Claude" FAB drawer.
* **Messaging Portal (`/messages`)**: Inbox list with active conversation screens.
* **Profile Console (`/profile/[id]`)**: Renders publication listings, researcher tier badges, ORCID links, and settings panels.

---

## 4. Existing API Inventory (Express.js Backend Router)
The backend exposes the following API routes under `/api/v1/` and `/api/`:

### Auth Router (`/api/v1/auth`)
* `POST /register` - Hashes password (Argon2id), generates and emails 6-digit OTP.
* `POST /verify-otp` - Verifies registration OTP and returns session JWT.
* `POST /login` - Checks credentials, signs JWT, sets session cookies.
* `POST /logout` - Clears authenticated cookies.
* `POST /verify/orcid` - Links academic ORCID identity via callback state verification.
* `POST /verify/student` - Generates OTP verification code to university email.

### Posts Router (`/api/v1/posts`)
* `GET /feed` - Returns a paginated list of posts with authors, reactions, and attachments.
* `POST /create` - Creates text/image/document posts.
* `POST /react` - Records reactions (Interesting, Novel, Needs Discussion).
* `POST /document/upload` - Manages PDF document uploads to AWS S3.
* `POST /view` - Tracks post views for analytics dashboard.

### Reels Router (`/api/v1/reels`)
* `GET /drafts` - Lists user's in-progress drafts.
* `POST /generate-draft` - Parses PDF and writes JSON scenes using Gemini.
* `POST /publish-draft/:id` - Triggers the video rendering queue.
* `GET /automation` & `POST /automation` - Updates automated publishing parameters.

### Collaboration Router (`/api/v1/projects`)
* `GET /` - Fetches workspaces.
* `GET /:project_id/tasks` - Fetches Kanban card lists.
* `PUT /task/update` - Modifies status of tasks.
* `GET /document/:document_id/versions` - Lists revision hashes.
* `POST /document/version/create` - Creates document version tags.

### AI RAG Router (`/api/v1/ai`)
* `POST /summarize` - Summarizes PDF files.
* `POST /ask-gemini` - Vectors query vs. Qdrant and returns LLM-grounded answers.
* `GET /recommendations` - Returns recommendations based on user research tags.

### Moderation Router (`/api/v1/moderation`)
* `POST /report` - Flags content.
* `GET /reports` - Fetches report list (Restricted to Moderator/Admin).
* `POST /reports/:id/resolve` - Resolves report.

---

## 5. Existing Database Inventory (PostgreSQL V16 Schema)
The PostgreSQL database has the following tables:
* `users` - Core user records, verification states, ORCID handles, and Stripe links.
* `institutions` - Universities and verified domain logs.
* `documents` - References to uploaded PDFs, summaries, and verification states.
* `posts` - Standard updates, categories, tags, and document links.
* `videos` - Published reels metadata, HLS paths, and scene markers.
* `conversations` & `conversation_participants` - Group or direct message links.
* `messages` - Message history with attachments.
* `reactions` - Custom reactions linked to posts and authors.
* `follows` - Follower/following link structures.
* `bookmarks` - Saved posts.
* `reel_drafts` - In-progress scene JSON and automation scripts.
* `reel_automation_settings` - User-level automated publishing metrics.

---

## 6. Technical Debt Report
* **Lack of ORM**: Queries are written in raw SQL. While fast, this limits database portability, makes migrations difficult, and increases the likelihood of syntax discrepancies.
* **Weak Error Bubbling**: Error boundaries are absent at route levels, causing occasional silent failures in forms.
* **OAuth Placeholders**: Social login buttons (Google, ORCID) exist visually on the frontend but map to partially mock callbacks.
* **Audit Trail Void**: The `audit_logs` table exists in DDL, but is rarely updated by database queries.

---

## 7. Scalability Issues
* **Video Rendering Bottleneck**: Reels are rendered synchronously on worker machines. Under load, this queue blocks CPU threads, causing delays in video processing.
* **Vector DB Latency**: The RAG parsing script doesn't limit PDF file sizes, exposing the API to timeouts and high token costs from very long documents.
* **Single Instance Redis**: Redis is used for API rate limiting, messaging pub/sub, and OTP storage. A single instance is a single point of failure.

---

## 8. Security Issues
* **Loose Upload Validation**: Files are validated by extension name, exposing S3 to malicious scripts disguised as PDFs.
* **API Rate Limits**: Rate limiting exists but uses a single configuration across all endpoints. Costly AI/RAG routes lack stricter limiters.
* **Missing Audit Controls**: User data alterations and moderator actions are not logged to a read-only table.

---

## 9. Missing Functionality
* **No Stripe Billing Integration**: UI features pricing tiers, but the backend lacks billing systems, subscription webhooks, or quota enforcement.
* **Incomplete Notification Stack**: Notifications are in-app only, lacking push, SMS, and email digests.
* **Plagiarism & Integrity Scans**: No automated cross-referencing for uploads, exposing the platform to duplicate submissions.

---

## 10. MVP vs. Production Gap Analysis

| Feature Dimension | MVP (V0.1) Status | Production (V1.0 Enterprise) Goal |
| :--- | :--- | :--- |
| **Video Rendering** | Single-worker sequential FFmpeg processing | Distributed GPU autoscaling clusters (AWS G5) |
| **Billing & Quota** | None; mock views displayed | Stripe customer portals, consumption meters |
| **Notifications** | Basic Socket.io events | Multi-channel (BullMQ, SES, Twilio, FCM) |
| **Security & Compliance**| Parameterized SQL | SOC2, GDPR compliance, KMS key rotations |
| **Academic Graph** | Direct DB joins | Neo4j citation relationships and link maps |
