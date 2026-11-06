# ResearchReel V1.0 Enterprise — Final Master Software Requirements Specification (SRS)

This document represents the final master Software Requirements Specification (SRS) for ResearchReel V1.0 Enterprise. It compiles functional, non-functional, security, and AI parameters into a blueprint for developers and AI agents.

---

## 1. System Vision & Scope
ResearchReel bridges academic literature and modern social engagement. The platform parses academic PDFs, updates vector and graph datastores, hosts Kanban workspaces, and uses GPU workers to transcode short-form vertical research reels.

---

## 2. Functional Requirements

### 2.1 Identity and Verification
* **REQ-F-101 (Academic Authentication)**: Users register with email validation. The account is set to unverified until OTP confirmation.
* **REQ-F-102 (ORCID Integration)**: Researchers link their ORCID profiles, upgrading their verified badge status to Gold (Scholar).
* **REQ-F-103 (Student Verification)**: Students verify accounts by submitting academic email domain verification codes.

### 2.2 Rich-Media Feed
* **REQ-F-201 (Post Creation)**: Users publish posts containing text, image attachments, or PDFs with LaTeX rendering support.
* **REQ-F-202 (Academic Reactions)**: Reactions are constrained to 🤔 Interesting, 💡 Novel, and ⚠️ Needs Discussion.

### 2.3 AI Reels Studio & Editor
* **REQ-F-301 (Script Generation)**: Processes PDFs, generating a 4-scene video script using Gemini models.
* **REQ-F-302 (Interactive Timeline)**: Visual multi-track timeline editor managing audio narration, video slides, and subtitle assets.
* **REQ-F-303 (Video Rendering)**: Renders 9:16 vertical videos (30-60s) with text overlays and background music, outputting multi-bitrate HLS streams.

### 2.4 Collaboration Workspaces
* **REQ-F-401 (Kanban Project Board)**: Teams assign and transition tasks across columns (Todo, In Progress, Review, Done).
* **REQ-F-402 (RAG Interrogation FAB)**: Highlighting PDF text opens an AI drawer containing grounded responses.

---

## 3. Non-Functional Requirements

### 3.1 Performance & Latency
* **REQ-NF-101 (Response Time)**: Core API responses must resolve in under 150ms under peak conditions.
* **REQ-NF-102 (Transcoding Duration)**: Video transcode tasks must complete in under 60 seconds per reel.
* **REQ-NF-103 (Mobile Layout)**: Pages must load interactive layouts in under 3 seconds on standard mobile devices.

### 3.2 Security, Privacy & Logs
* **REQ-NF-201 (JWT Cookie)**: JWT session tokens are stored in HttpOnly cookies to block stored XSS vectors.
* **REQ-NF-202 (Data Erasure)**: Satisfies GDPR criteria. Soft-deleted assets are purged after 30 days.
* **REQ-NF-203 (Audit Trail)**: Security events and moderator decisions write log records containing timestamp, user, action details, and IP.

---

## 4. Database & Infrastructure Requirements
* **REQ-DB-101 (Database Division)**:
  * PostgreSQL: Manages users and transactions.
  * MongoDB: Handles workspaces, chats, and Kanban tasks.
  * Neo4j: Tracks citation graphs.
  * Qdrant: Stores vectors for document searches.
* **REQ-INF-101 (Kubernetes Shell)**: Orchestrates microservices inside EKS clusters with HPAs scaling pods dynamically.
