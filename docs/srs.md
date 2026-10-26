# SRS: ResearchReel

Version: 1.1  
Date: 2026-07-06

## 1. Purpose
ResearchReel helps researchers turn papers, datasets, and scholarly updates into short-form research posts, reels, discussions, and collaborative project workspaces. The app serves students, scholars, professors, moderators, and admins who need a research-native social and collaboration platform with real authentication, content workflows, AI assistance, and moderation.

## 2. Scope
V1 includes email/password authentication with OTP verification, research feed posting, media/document upload, reels playback and generation, search, profile management, messaging, project collaboration, AI paper/chat assistance, moderation, and operational deployment through Docker.

V1 does not include unimplemented OAuth buttons, visual-only social actions, fake demo sessions, or local-only mock data for user-facing flows that already have backend services.

## 3. User Roles
- Guest: can view the landing page and sign in or register.
- Viewer/User: can browse public content, search, save, comment, and manage a basic profile.
- Student/Scholar/Professor: can publish research content, upload documents, create reels, use AI assistance, and join projects.
- Moderator: can review reported content and apply moderation actions.
- Admin: can manage users, moderation policy, system configuration, and operational health.

## 4. Functional Requirements

### 4.1 Landing, Login, Registration, OTP
- Inputs: email, password, full name for registration, optional DOI, 6-digit OTP.
- Data source: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/verify-otp`.
- Login success: store returned user and access token through `AuthContext`, set backend cookies, redirect to `/home`.
- Login failure: show inline API or network error and keep the user on the form.
- Registration success: show OTP verification state for the submitted email.
- OTP success: store session and redirect to `/home`.
- OTP failure: show inline error and allow retry or resend.
- Empty/loading states: disable submit while required fields are missing or a request is in flight.

### 4.2 Home Feed
- Inputs: post actions, comments, reactions, share/save controls, feed refresh.
- Data source: `GET /api/posts`, post/comment/reaction endpoints, realtime updates where socket service is available.
- Success: render persisted posts from the backend, merge realtime updates without duplicating items.
- Empty state: show a useful no-posts state with a route to create content.
- Error state: show retryable feed load errors.

### 4.3 Create Post And Media Upload
- Inputs: caption, content type, media/document upload, DOI metadata.
- Data source: media routes under `/api/media`, post routes under `/api/posts`, DOI routes under `/api/doi`.
- Success: uploaded assets are persisted, scanned/validated, attached to a created post, and visible in the feed after reload.
- Failure: validation, virus scan, upload, DOI lookup, and persistence errors are surfaced inline.

### 4.4 Reels
- Inputs: vertical reel navigation, watch tracking, like/comment/share/save, generator prompt/source controls.
- Data source: `/api/reels` and reel generation services.
- Success: reels play from stored media URLs, watch events are recorded, generated reels persist with generated parts and assets.
- Empty state: show no reels available and route qualified users to the generator.
- Error state: show media playback or generation failure with retry where applicable.

### 4.5 Search And Discovery
- Inputs: search query, filters, selected result.
- Data source: `/api/search` backed by configured search services.
- Success: results are grouped by papers, users, posts, and reels where supported.
- Empty state: show no results for the submitted query.
- Error state: show a retryable search failure without clearing the current query.

### 4.6 Profiles And Settings
- Inputs: profile fields, ORCID/academic verification fields, privacy and notification settings.
- Data source: `/api/users`, `/api/auth/verify/orcid`, `/api/auth/verify/student`.
- Success: profile updates persist across reloads and verification status is reflected in profile UI.
- Failure: invalid profile fields, duplicate handles, and verification errors are shown inline.

### 4.7 Messaging
- Inputs: conversation selection, message body, send action, search.
- Data source: `/api/messages` and socket service.
- Success: sent messages persist, appear in the active conversation, and remain after reload.
- Empty state: show no conversations or no messages for a selected thread.
- Error state: show send failures and preserve the unsent message body.

### 4.8 Projects And Workspace
- Inputs: create project, invite collaborators, update Kanban tasks, version/document actions.
- Data source: `/api/projects`.
- Success: project metadata, tasks, collaborators, and versions persist.
- Empty state: show no projects/tasks with a create action.
- Error state: show permission, validation, and persistence failures.

### 4.9 AI Assistance
- Inputs: chat prompts, document questions, summary/generation requests.
- Data source: `/api/ai`, RAG microservice, configured Gemini/Qdrant services.
- Success: AI responses are grounded in uploaded or selected research sources when context is available.
- Failure: missing API keys, unavailable RAG service, safety errors, and timeouts are shown clearly.

### 4.10 Moderation
- Inputs: report content, moderation queue actions, policy decisions.
- Data source: `/api/moderation`.
- Success: reports persist, actions update content status, and audit records are available.
- Failure: permission and validation failures are shown and logged.

## 5. Non-Functional Requirements
- Security: validated inputs, rate limiting, Helmet, secure cookies in production, secret values outside source control, no demo auth bypasses.
- Performance: primary pages should load interactive UI in under 3 seconds on local development hardware after services are warm.
- Reliability: API failures must not leave forms in stuck loading states.
- Accessibility: forms require labels, visible errors, keyboard support, and sufficient contrast.
- Observability: backend logs should capture request, error, moderation, and AI failure context without leaking secrets.
- Deployment: Docker Compose must run frontend, API, RAG service, worker, Postgres, and Redis with documented environment variables.

## 6. Data Model
- User: id, email, username, password_hash, full_name, role, verification_status, orcid_id, institution_name, research_interests, created_at.
- Post: id, author_id, content_type, caption, media_url, doi, moderation_status, created_at.
- Reel: id, author_id, source_post_id, title, video_url, hls_url, thumbnail_url, generation_status, created_at.
- Message: id, conversation_id, sender_id, body, read_at, created_at.
- Project: id, owner_id, title, description, visibility, created_at.
- ProjectTask: id, project_id, title, status, assignee_id, due_at.
- ModerationReport: id, reporter_id, target_type, target_id, reason, status, reviewer_id, created_at.
- AuditLog: id, actor_id, action, target_type, target_id, metadata, created_at.

## 7. API Endpoints
| Method | Endpoint | Purpose | Auth |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Create account and send OTP | No |
| POST | `/api/auth/verify-otp` | Verify OTP and issue session | No |
| POST | `/api/auth/login` | Login and issue session | No |
| POST | `/api/auth/logout` | Clear auth cookies | Optional |
| GET/POST | `/api/posts` | Read/create feed posts | Yes for create |
| GET/POST | `/api/reels` | Read/create reels | Yes for create |
| POST | `/api/media` | Upload and process media | Yes |
| GET | `/api/search` | Search research content | Optional |
| GET/POST | `/api/messages` | Conversations and messages | Yes |
| GET/POST | `/api/projects` | Project collaboration | Yes |
| POST | `/api/ai` | AI/RAG assistance | Yes |
| GET/POST | `/api/moderation` | Moderation queue/actions | Moderator/Admin |

## 8. Edge Cases And Error Handling
- Network failure mid-request: stop loading state, preserve user input, show retryable error.
- Duplicate submission: disable submit while request is in flight.
- Empty backend collections: show explicit empty state rather than seeded mock cards.
- Expired session: clear local session and route to login after a visible auth error.
- Missing AI/media/search dependencies: show service unavailable state and log backend context.
- Large/unsupported uploads: reject with specific validation message before or during upload.
- Moderation denied: show permission error and keep content state unchanged.

## 9. Definition Of Done
- Every visible button, link, and form either performs a real action or is removed.
- Every user-facing flow names and handles loading, empty, error, and success states.
- Data that should persist survives reloads and uses backend storage.
- No mock-token, fake-user, demo-only success path is introduced in production code.
- Core flows verified: register -> OTP -> home, login -> home, create post -> feed, upload media -> post, generate/view reel, search, update profile, send message, project task update, report/moderate content.
- Tests or type checks are run for changed surfaces, with any skipped checks documented.
