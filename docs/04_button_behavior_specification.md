# ResearchReel — Complete Interaction & Button Specification Document

This document provides a registry of every clickable button, input trigger, and interactive link in the ResearchReel platform. Every action must perform a functional operation, update the database, and trigger telemetry.

---

## 1. Authentication Portal

### 1.1 `btn-login-submit` (Login Form Submit)
* **Location**: `/auth/login` page card.
* **Permission**: Guest / All Users.
* **Action Performed**: Validates inputs, signs user session.
* **API Called**: `POST /api/v1/auth/login`
* **Database Update**: Updates `last_active` timestamp in the `users` table.
* **Loading State**: Disables the input fields and displays a loading spinner inside the button.
* **Success State**: Saves JWT to client cookies, displays a "Login successful!" toast message.
* **Error State**: Displays red inline messages: "Incorrect password" or "Email not found".
* **Analytics Event**: `user_login_success` (Telemetry payload: user ID, platform type).
* **Audit Log Event**: `login_event` (IP address, device metadata).
* **Redirect Destination**: `/home`

### 1.2 `btn-register-submit` (Registration Submit)
* **Location**: `/auth/register` wizard page.
* **Permission**: Guest.
* **Action Performed**: Creates unverified account, triggers verification email.
* **API Called**: `POST /api/v1/auth/register`
* **Database Update**: Inserts a new row to the `users` table (`verified_status = 'unverified'`).
* **Loading State**: Disables submit button and changes text to "Creating account...".
* **Success State**: Opens OTP verification page.
* **Error State**: Displays toast message: "Email already registered".
* **Analytics Event**: `user_registration_started`.
* **Audit Log Event**: `user_created` (IP address, email, role).
* **Redirect Destination**: `/auth/verify`

### 1.3 `btn-verify-otp-submit` (OTP Verification Submit)
* **Location**: `/auth/verify` page.
* **Permission**: Unverified User.
* **Action Performed**: Submits the 6-digit verification code.
* **API Called**: `POST /api/v1/auth/verify-otp`
* **Database Update**: Updates row in the `users` table: `verification_status = 'verified'`.
* **Loading State**: Spinners replace OTP field entries.
* **Success State**: Shows success toast: "Welcome to ResearchReel!".
* **Error State**: Displays inline error: "Invalid OTP code".
* **Analytics Event**: `email_verification_success`.
* **Audit Log Event**: `user_verified` (User ID, IP).
* **Redirect Destination**: `/home`

---

## 2. Creator Workspace & Video Studio

### 2.1 `btn-document-upload` (PDF File Drag-Drop/Select Uploader)
* **Location**: `/create/upload` view.
* **Permission**: Student+.
* **Action Performed**: Triggers file dialog and uploads selected PDF to staging.
* **API Called**: `POST /api/v1/media/upload` (via S3 pre-signed URL upload pipeline).
* **Database Update**: Inserts row to the `documents` table.
* **Loading State**: Displays a horizontal progress bar indicating upload percentage.
* **Success State**: PDF is processed by RAG workers; displays "Document parsed successfully!".
* **Error State**: Red banner alert: "File must be under 50MB and in PDF/DOCX format".
* **Analytics Event**: `document_upload_success` (Document ID, file size).
* **Audit Log Event**: `document_uploaded` (Document ID, user ID).
* **Redirect Destination**: Dynamic loading state -> `/editor/[draft_id]`.

### 2.2 `btn-generate-draft` (Trigger AI Video Script Drafting)
* **Location**: `/create` page panel.
* **Permission**: Scholar+.
* **Action Performed**: Requests LLM to generate scenes based on uploaded paper.
* **API Called**: `POST /api/v1/reels/generate-draft`
* **Database Update**: Inserts a row to the `reel_drafts` table.
* **Loading State**: Full-screen skeleton layout showing parsing steps.
* **Success State**: Video Editor loaded with 4 editable scenes populated with text script drafts.
* **Error State**: Toast message: "AI worker failed. Try adjusting prompt parameters".
* **Analytics Event**: `ai_script_generation_success` (Document ID, draft ID).
* **Audit Log Event**: `reel_draft_created` (User ID, draft ID).
* **Redirect Destination**: `/editor/[draft_id]`

### 2.3 `btn-publish-reel` (Render and Transcode Draft)
* **Location**: `/editor/[id]` page footer.
* **Permission**: Student+.
* **Action Performed**: Submits draft script structure and launches video render queue.
* **API Called**: `POST /api/v1/reels/publish-draft/:id`
* **Database Update**: Writes a row to the `videos` table and updates `reel_drafts.status = 'published'`.
* **Loading State**: Disables editor sidebar, changes status to "Rendering video...".
* **Success State**: Toast message: "Reel published successfully!".
* **Error State**: Error banner: "Video rendering failed. Please try a different script".
* **Analytics Event**: `reel_transcoding_completed` (Reel ID, duration).
* **Audit Log Event**: `reel_published` (Reel ID, user ID).
* **Redirect Destination**: `/reels`

---

## 3. Collaboration & Workspace Boards

### 3.1 `btn-update-task-lane` (Kanban Task Card Drag-Drop Trigger)
* **Location**: `/workspace/[id]` Kanban board lanes.
* **Permission**: Member.
* **Action Performed**: Updates task completion lane.
* **API Called**: `PUT /api/v1/projects/task/update`
* **Database Update**: Updates MongoDB card document structure (`status` field).
* **Loading State**: Card opacity reduces, cursor turns into a spinner.
* **Success State**: Instantly aligns card position in the target lane.
* **Error State**: Reverts card position to source lane; toast displays "Permission denied".
* **Analytics Event**: `kanban_card_moved`.
* **Audit Log Event**: `kanban_task_status_changed` (Task ID, old status, new status).
* **Redirect Destination**: None.

### 3.2 `btn-ask-gemini-submit` (RAG Query Input Submit)
* **Location**: `/document/[id]` RAG chat sidebar.
* **Permission**: Student+.
* **Action Performed**: Sends query and returns Gemini-grounded summary.
* **API Called**: `POST /api/v1/ai/ask-gemini`
* **Database Update**: Writes logging metrics to AI token usage metrics table.
* **Loading State**: Displays shimmering bubbles in the chat thread.
* **Success State**: Renders AI message bubble with references and links to pages.
* **Error State**: AI bubble displays: "AI engine timed out. Try rephrasing your question".
* **Analytics Event**: `ai_rag_query_submitted` (Document ID, query token count).
* **Audit Log Event**: None.
* **Redirect Destination**: None.
