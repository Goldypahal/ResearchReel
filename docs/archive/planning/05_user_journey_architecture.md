# ResearchReel — User Journey & Experience Flow Architecture

This document specifies the step-by-step user journeys across visitor, creator, collaboration, and billing lifecycles. Each flow details critical decision points, success outcomes, failure modes, and recovery paths.

---

## 1. Authentication & Onboarding Lifecycle

### 1.1 Signup & Verification Flow
1. **Entry**: Visitor lands on `/` and clicks "Sign Up".
2. **Form Entry**: Enters full name, institutional email address, desired username, password, and selects primary academic role (Student, Scholar, Faculty).
3. **Validation Check**:
   * *Decision Point*: Is the password strong (length >= 8, numbers, symbols)? Is the email in a valid university domain?
   * *Success Path*: Submits payload. Redirects to `/auth/verify`.
   * *Failure Path (Validation)*: UI shows error below field. Input focus is kept on field for recovery.
   * *Failure Path (Duplicate Account)*: API returns `409 Conflict`. UI shows message: "Email already registered, did you mean to log in?".
4. **OTP Verification**:
   * *Step*: User receives 6-digit OTP code in their email inbox.
   * *Success Path*: User inputs code. Redirects to `/home` feed page with session cookie set.
   * *Failure Path (Invalid Code)*: Toast shows: "Invalid code. Please try again or click Resend".
   * *Recovery Path*: User clicks "Resend OTP", triggering new code generation.

---

## 2. Document-to-Reel Creation Workflow

### 2.1 Research Document Upload & Parsing
1. **Entry**: Creator navigates to `/create` and uploads a research paper PDF.
2. **File Validation**:
   * *Decision Point*: Is the file size <= 50MB? Is it a valid PDF document?
   * *Success Path*: File uploads to S3 bucket. Parsing starts.
   * *Failure Path*: Upload rejects. Inline warning: "File size exceeds 50MB".
3. **AI Parsing & Embedding**:
   * *Step*: Backend parses text blocks, extracts key findings, and updates the Qdrant index.
   * *Success Path*: Workspace shows "Parse successful!". Activates "Create AI Reel" controls.
   * *Failure Path (PDF corruption)*: RAG worker fails to parse text.
   * *Recovery Path*: UI asks user to input paper summary manually.

### 2.2 Video Editing & Publication
1. **Entry**: User clicks "Create AI Reel Draft".
2. **Script Generation**:
   * *Step*: Gemini processes parsed text, generating a 4-scene script (Intro, Problem, Method, Results) and vocal narrations.
   * *Success Path*: Populates the Timeline Canvas UI with draft scenes.
   * *Failure Path (LLM Rate Limit)*: RAG API returns `429`.
   * *Recovery Path*: System falls back to a locally-hosted Mistral 7B endpoint.
3. **Vocal & Background Selection**:
   * *Step*: Creator edits scene script lines, assigns accents (e.g. US Female, UK Male), and chooses a background video/image.
4. **Rendering & Publishing**:
   * *Step*: Creator clicks "Publish Reel". The rendering worker processes the video.
   * *Success Path*: The transcoded HLS stream appears in the Reels feed.
   * *Failure Path (Transcoding timeout)*: The worker crashes mid-FFmpeg run.
   * *Recovery Path*: Status is marked as `failed` in the database, notifying the user: "Rendering failed. Please review layout constraints and retry".

---

## 3. Team Collaboration & Projects Lifecycle

### 3.1 Project Board & Workspace Setup
1. **Entry**: User clicks "New Workspace" in `/projects`.
2. **Setup**: Enters project name, description, adds emails of collaborators, and assigns roles (Admin, Editor, Reviewer).
3. **Collaborator Join**:
   * *Step*: Invited users receive emails with access links.
   * *Success Path*: Invited users click links, register/login, and join the workspace.
4. **Kanban Collaboration**:
   * *Step*: Collaborators create task cards, assign tasks to team members, set deadlines, and transition cards across lanes.

---

## 4. SaaS Subscription & Billing Lifecycle

### 4.1 Upgrade Subscription Flow
1. **Entry**: User navigates to Settings -> Billing and clicks "Upgrade to Pro".
2. **Stripe Portal Handshake**:
   * *Step*: API generates Stripe pre-signed URL, redirecting the client to the checkout page.
3. **Payment Completion**:
   * *Success Path*: Stripe records transaction, publishes an `invoice.paid` webhook event, and updates the user's role status to `pro`. Redirects to `/profile/settings/billing` showing "Pro Active".
   * *Failure Path (Card Decline)*: Stripe declines payment, showing error messages.
   * *Recovery Path*: User inputs alternate payment method on Stripe portal.
4. **Cancellation Flow**:
   * *Step*: User clicks "Cancel Subscription".
   * *Action*: Downgrades tier to `free` at the end of the billing period.
