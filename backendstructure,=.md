ResearchReel — Backend & Database Production Specification
0. System Definition
Application

ResearchReel

Backend Architecture
Frontend
   │
   │ HTTPS / REST
   ▼
API Gateway / Express
   │
   ├── Authentication
   ├── Authorization
   ├── Validation
   ├── Rate Limiting
   ├── API Controllers
   │
   ├──────────────┬───────────────┬───────────────┐
   ▼              ▼               ▼               ▼
PostgreSQL      Redis          RAG Service     Object Storage
   │              │               │               │
   │              │               │               └── PDFs / Media
   │              │               │
   │              │               └── Embeddings / Retrieval
   │              │
   │              └── Cache / Sessions / Jobs / OTP
   │
   └── Core application data
Recommended Backend Stack
Layer	Technology
API	Node.js + Express
Language	JavaScript/TypeScript
Database	PostgreSQL
Cache	Redis
AI/RAG	Python FastAPI
Search	PostgreSQL FTS / Elasticsearch
Files	S3-compatible object storage
Authentication	JWT + HttpOnly cookies
Password Hashing	Argon2
Validation	Zod/Joi
API Documentation	OpenAPI/Swagger
Logging	Pino/Winston
Testing	Jest/Vitest/Supertest
Containers	Docker
Reverse Proxy	NGINX
1. Backend Architecture
High-Level Structure
backend/
│
├── src/
│   ├── app.js
│   ├── server.js
│   │
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   ├── storage.js
│   │   └── environment.js
│   │
│   ├── routes/
│   │
│   ├── controllers/
│   │
│   ├── services/
│   │
│   ├── repositories/
│   │
│   ├── middleware/
│   │
│   ├── validators/
│   │
│   ├── models/
│   │
│   ├── jobs/
│   │
│   ├── events/
│   │
│   ├── utils/
│   │
│   └── types/
│
├── research_rag/
│   ├── main.py
│   ├── api/
│   ├── retrieval/
│   ├── embeddings/
│   ├── generation/
│   └── document_processing/
│
├── migrations/
├── seeds/
├── tests/
│
├── Dockerfile
└── package.json
2. Backend Request Architecture

Every request should follow:

HTTP Request
     │
     ▼
CORS
     │
     ▼
Helmet / Security Headers
     │
     ▼
Request ID
     │
     ▼
Rate Limiter
     │
     ▼
Authentication
     │
     ▼
Authorization
     │
     ▼
Request Validation
     │
     ▼
Controller
     │
     ▼
Service
     │
     ▼
Repository
     │
     ▼
PostgreSQL / Redis / Storage
     │
     ▼
Service Response
     │
     ▼
Controller
     │
     ▼
Standard API Response
3. API Response Standard

All APIs should use a consistent response format.

Success
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
Error
{
  "success": false,
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "The requested document does not exist."
  },
  "requestId": "req_123"
}

Never return raw database errors to the frontend.

4. Authentication Architecture
Authentication Flow
Register
   ↓
Hash Password
   ↓
Create User
   ↓
Generate OTP
   ↓
Store OTP in Redis
   ↓
Email OTP
   ↓
Verify OTP
   ↓
Create Session
   ↓
HttpOnly Cookies
Cookies
accessToken
refreshToken

Recommended:

HttpOnly = true
Secure = true in production
SameSite = Lax/Strict depending on deployment
5. Authentication APIs
POST /api/v1/auth/register
Purpose

Create a new ResearchReel account.

Request
{
  "fullName": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "StrongPassword123!"
}
Validation
Email valid
Username >= 3 chars
Password >= 8 chars
Username unique
Email unique
Response
{
  "success": true,
  "message": "Verification code sent."
}
API: Verify OTP
POST

/api/v1/auth/verify-otp

Request
{
  "email": "john@example.com",
  "otp": "123456"
}
Success

Create authenticated session.

API: Login
POST

/api/v1/auth/login

Request
{
  "email": "john@example.com",
  "password": "..."
}
Success

Set:

HttpOnly accessToken
HttpOnly refreshToken

Do not return the access token for frontend localStorage storage.

API: Refresh Session
POST

/api/v1/auth/refresh

Purpose

Issue a new access token.

Architecture
Refresh Token
      ↓
Validate Session
      ↓
Rotate Refresh Token
      ↓
New Access Token
      ↓
New Refresh Token
API: Logout
POST

/api/v1/auth/logout

Required behavior
Identify current session.
Revoke session.
Clear cookies.

This is stronger than simply clearing browser cookies.

6. Session Database

Create:

user_sessions

Fields:

id
user_id
refresh_token_hash
device_name
ip_address
user_agent
created_at
last_used_at
expires_at
revoked_at

Never store raw refresh tokens.

7. Authorization Architecture

Authentication answers:

Who are you?

Authorization answers:

Are you allowed to access this resource?

Use:

authenticate
authorizeRole
authorizeResource

Example:

authenticate
      ↓
authorizeProjectMember
      ↓
controller
8. Resource Authorization

Create centralized authorization services.

authorization/
├── projectAuthorization.js
├── documentAuthorization.js
├── conversationAuthorization.js
├── reelAuthorization.js
└── workspaceAuthorization.js
9. Project Authorization

Never trust:

req.query.user_id
req.body.user_id

Instead:

req.user.id

Project access query:

SELECT p.*
FROM projects p
LEFT JOIN project_members pm
  ON pm.project_id = p.id
WHERE p.id = $1
AND (
    p.creator_id = $2
    OR pm.user_id = $2
);
10. Document Authorization

Every document operation should check:

document owner
OR
project membership
OR
explicit share permission

Conceptually:

canAccessDocument(userId, documentId)

Returns:

{
  "allowed": true,
  "permission": "edit"
}

Permissions:

viewer
commenter
editor
owner
11. Backend Modules

ResearchReel should have the following major backend modules:

Authentication
Users
Documents
Research
AI
RAG
Projects
Tasks
Reels
Messaging
Posts
Citations
Search
Notifications
Media
Workspaces
Billing
Moderation
Analytics
12. User Module
APIs
GET    /users/:username
GET    /users/me
PUT    /users/update
GET    /users/analytics/:user_id
Important

Public profile must use an explicit column list.

Never:

SELECT u.*

Instead:

SELECT
    id,
    username,
    full_name,
    avatar_url,
    bio,
    institution,
    research_interests,
    created_at
FROM users
WHERE username = $1;

Never expose:

password_hash
refresh_token
API keys
internal security metadata
13. Research Document Module
Document Lifecycle
Upload
  ↓
Storage
  ↓
Metadata Extraction
  ↓
Text Extraction
  ↓
Chunking
  ↓
Embedding
  ↓
Vector Index
  ↓
Ready
Document states
UPLOADING
PROCESSING
READY
FAILED
DELETED
API: Upload
POST

/api/v1/assets/upload-url

Generate signed upload URL.

Security

Object key must be generated server-side:

users/{userId}/{uuid}.pdf

Never allow the client to choose arbitrary storage paths.

API: Register Document
POST

/api/v1/assets/register

Request:

{
  "fileName": "paper.pdf",
  "mimeType": "application/pdf",
  "size": 2300000
}

Server determines:

owner_id
storage_key
bucket
API: Library
GET

/api/v1/assets

Returns only:

WHERE owner_id = req.user.id
14. Document Database Schema
documents
id UUID PK
owner_id UUID FK users
title VARCHAR
abstract TEXT
doi VARCHAR
publication_year INT
journal VARCHAR
file_url TEXT
storage_key TEXT
mime_type VARCHAR
file_size BIGINT
status VARCHAR
visibility VARCHAR
metadata JSONB
created_at TIMESTAMP
updated_at TIMESTAMP
deleted_at TIMESTAMP

Indexes:

owner_id
doi
created_at
status
15. Document Versions
document_versions
id UUID PK
document_id UUID FK
author_id UUID FK
version_number INT
content TEXT
change_summary TEXT
created_at TIMESTAMP

Constraint:

(document_id, version_number) UNIQUE
Security

author_id must always come from:

req.user.id

Never from the request body.

16. AI Module
APIs
POST /api/v1/ai/summarize
POST /api/v1/ai/ask-gemini
GET  /api/v1/ai/recommendations
POST /api/v1/ai/script
POST /api/v1/ai/voice

Every document-related AI operation must perform:

authenticate
     ↓
document authorization
     ↓
AI operation
17. AI Ask Architecture
User Question
      ↓
Document Authorization
      ↓
RAG Service
      ↓
Query Embedding
      ↓
Vector Search
      ↓
Relevant Chunks
      ↓
LLM
      ↓
Answer + Citations
      ↓
Frontend
18. RAG Service

Recommended Python service:

research_rag/
│
├── api/
│   └── routes.py
│
├── ingestion/
│   ├── parser.py
│   ├── chunker.py
│   └── metadata.py
│
├── retrieval/
│   ├── embeddings.py
│   ├── vector_search.py
│   └── reranker.py
│
├── generation/
│   ├── prompts.py
│   └── answer_generator.py
│
└── evaluation/
    └── metrics.py
19. RAG Database

If using PostgreSQL + pgvector:

document_chunks
id UUID PK
document_id UUID FK
chunk_index INT
content TEXT
page_number INT
section VARCHAR
embedding VECTOR
token_count INT
created_at TIMESTAMP

Indexes:

document_id
embedding vector index
20. AI Conversation Storage
ai_conversations
id UUID PK
user_id UUID FK
document_id UUID FK NULL
title VARCHAR
created_at
updated_at
ai_messages
id UUID PK
conversation_id UUID FK
role VARCHAR
content TEXT
sources JSONB
created_at

Roles:

user
assistant
system
21. Projects Module
APIs
GET    /projects
POST   /projects
GET    /projects/:id
PUT    /projects/:id
DELETE /projects/:id

GET    /projects/:id/tasks
POST   /projects/:id/tasks
PUT    /projects/tasks/:taskId
DELETE /projects/tasks/:taskId

GET    /projects/:id/members
POST   /projects/:id/members
DELETE /projects/:id/members/:userId
22. Project Database
projects
id UUID PK
creator_id UUID FK users
name VARCHAR
description TEXT
research_field VARCHAR
visibility VARCHAR
created_at
updated_at
project_members
project_id UUID FK
user_id UUID FK
role VARCHAR
joined_at TIMESTAMP

Composite primary key:

(project_id, user_id)

Roles:

owner
admin
researcher
contributor
viewer
23. Project Documents

Use a junction table.

project_documents
project_id UUID FK
document_id UUID FK
added_by UUID FK
added_at TIMESTAMP

This is better than putting project IDs directly inside documents because a paper can belong to multiple projects.

24. Tasks
tasks
id UUID PK
project_id UUID FK
created_by UUID FK
assigned_to UUID FK NULL
title VARCHAR
description TEXT
status VARCHAR
priority VARCHAR
position INT
due_date TIMESTAMP
created_at
updated_at

Status:

todo
in_progress
review
done
25. Task Authorization

Updating a task requires:

authenticate
      ↓
find task
      ↓
find project
      ↓
verify project membership
      ↓
verify permission
      ↓
update

Never:

UPDATE tasks
WHERE id = taskId

without checking project authorization.

26. Messaging Module
APIs
GET  /messages/conversations
GET  /messages/:conversationId/messages
POST /messages/send
POST /messages/read
27. Conversation Database
conversations
id UUID PK
type VARCHAR
created_at
updated_at

Types:

direct
group
project
conversation_participants
conversation_id UUID FK
user_id UUID FK
role VARCHAR
joined_at
last_read_at
28. Message Database
messages
id UUID PK
conversation_id UUID FK
sender_id UUID FK
content TEXT
message_type VARCHAR
file_url TEXT
created_at
edited_at
deleted_at
29. Messaging Authorization

Before reading:

Does req.user.id exist
in conversation_participants?

Before sending:

sender_id = req.user.id

Never accept:

sender_id
user_id

from the client.

30. Real-Time Messaging

Recommended:

WebSocket

Flow:

User A sends message
       ↓
API
       ↓
Validate participant
       ↓
Save PostgreSQL
       ↓
Publish Redis event
       ↓
WebSocket server
       ↓
User B

Redis Pub/Sub can synchronize multiple backend instances.

31. Reels Module
APIs
GET    /reels/drafts
GET    /reels/draft/:id
POST   /reels/generate-draft
PUT    /reels/draft/:id
POST   /reels/publish-draft/:id
GET    /reels/documents
GET    /reels/automation
POST   /reels/automation
32. Reel Database
reels
id UUID PK
author_id UUID FK
source_document_id UUID FK
title VARCHAR
description TEXT
script TEXT
video_url TEXT
thumbnail_url TEXT
duration INT
status VARCHAR
visibility VARCHAR
created_at
updated_at
published_at

Statuses:

draft
processing
ready
published
failed
33. Reel Generation Pipeline
Document
   ↓
Authorization
   ↓
Extract research
   ↓
Generate script
   ↓
Generate voice
   ↓
Generate video
   ↓
Generate thumbnail
   ↓
Store assets
   ↓
Update reel
   ↓
Notify user

This should be asynchronous.

34. Background Job Architecture

Use Redis-backed queues.

Recommended:

BullMQ

Queues:

document-processing
embedding-generation
ai-generation
reel-generation
email
notifications
analytics

Example:

POST /reels/generate
       ↓
Create reel status = processing
       ↓
Queue job
       ↓
Return 202 Accepted
       ↓
Worker processes job
       ↓
Update reel
       ↓
Notification

The HTTP request should not wait for a multi-minute AI/video process.

35. Notifications
notifications
id UUID PK
user_id UUID FK
type VARCHAR
title VARCHAR
message TEXT
resource_type VARCHAR
resource_id UUID
is_read BOOLEAN
created_at TIMESTAMP

Types:

message
project_invite
task_assignment
paper_ready
ai_complete
reel_ready
comment
like
follow
36. Social Posts
posts
id UUID PK
author_id UUID FK
content TEXT
media_url TEXT
visibility VARCHAR
created_at
updated_at
deleted_at
post_reactions
post_id UUID
user_id UUID
reaction_type VARCHAR
created_at

Unique:

(post_id, user_id)
37. Comments
comments
id UUID PK
post_id UUID FK
author_id UUID FK
parent_id UUID NULL
content TEXT
created_at
updated_at
deleted_at

parent_id supports nested replies.

38. Citations
papers
id UUID PK
doi VARCHAR UNIQUE
title TEXT
abstract TEXT
authors JSONB
journal VARCHAR
publication_year INT
citation_count INT
metadata JSONB
created_at
updated_at
paper_citations
source_paper_id UUID
target_paper_id UUID

This creates a citation graph:

Paper A
  │
  ├── cites → Paper B
  ├── cites → Paper C
  └── cites → Paper D
39. Search Architecture

Search should support:

papers
documents
users
projects
reels

Initial implementation:

PostgreSQL Full Text Search

Later scale to:

Elasticsearch / OpenSearch

Search pipeline:

Query
 ↓
Normalize
 ↓
Full-text search
 ↓
Filters
 ↓
Ranking
 ↓
Pagination
40. Analytics
analytics_events
id UUID PK
user_id UUID NULL
event_type VARCHAR
resource_type VARCHAR
resource_id UUID NULL
metadata JSONB
created_at TIMESTAMP

Examples:

paper_viewed
paper_saved
ai_question
reel_created
reel_published
project_created
message_sent

For analytics, don't expose arbitrary user IDs through the API.

Use:

GET /users/me/analytics

rather than:

GET /users/analytics/:user_id

unless there is a legitimate administrative use case.

41. Workspace Module
APIs
POST /workspaces
GET  /workspaces
GET  /workspaces/:id
PUT  /workspaces/:id

Every workspace route must require authentication.

Never fall back to:

anonymous

for ownership.

42. Workspace Database
workspaces
id UUID PK
name VARCHAR
owner_id UUID FK users
created_at
updated_at
workspace_members
workspace_id UUID FK
user_id UUID FK
role VARCHAR
joined_at
43. Billing
APIs
POST /billing/checkout
POST /billing/webhook
GET  /billing/subscription

Checkout requires authentication.

Price IDs must be server-controlled.

Instead of trusting:

{
  "priceId": "client-provided-value"
}

use:

plan = "pro"

and map:

pro → STRIPE_PRO_PRICE_ID

on the server.

44. Billing Database
subscriptions
id UUID PK
user_id UUID FK
provider VARCHAR
provider_customer_id VARCHAR
provider_subscription_id VARCHAR
plan VARCHAR
status VARCHAR
current_period_start TIMESTAMP
current_period_end TIMESTAMP
created_at
updated_at
45. Moderation
APIs
POST /moderation/report
GET  /moderation/reports
POST /moderation/reports/:id/resolve
GET  /moderation/users
POST /moderation/users/:id/verify

Roles:

admin
moderator

But role-changing operations should generally be:

admin only

A moderator should not be able to assign themselves or another user admin.

46. Moderation Database
reports
id UUID PK
reporter_id UUID FK
resource_type VARCHAR
resource_id UUID
reason VARCHAR
description TEXT
status VARCHAR
resolved_by UUID NULL
resolved_at TIMESTAMP NULL
created_at TIMESTAMP
47. Database Relationship Map
                         ┌──────────────┐
                         │    USERS     │
                         └──────┬───────┘
                                │
          ┌─────────────┬───────┼────────┬─────────────┐
          │             │       │        │             │
          ▼             ▼       ▼        ▼             ▼
      Documents      Projects  Posts   Reels      Conversations
          │             │       │        │             │
          │             │       │        │             ▼
          ▼             ▼       ▼        ▼          Messages
      Chunks         Tasks   Comments  Media
          │
          ▼
        Embeddings
          │
          ▼
       RAG / AI
48. Core Database ER Structure
users
 │
 ├── documents
 │     ├── document_versions
 │     └── document_chunks
 │
 ├── projects
 │     ├── project_members
 │     ├── project_documents
 │     └── tasks
 │
 ├── reels
 │
 ├── posts
 │     ├── comments
 │     └── post_reactions
 │
 ├── conversations
 │     └── messages
 │
 ├── notifications
 │
 ├── ai_conversations
 │     └── ai_messages
 │
 ├── subscriptions
 │
 └── sessions
49. Database Constraints

Use database-level constraints wherever possible.

Users
email UNIQUE
username UNIQUE
Projects
creator_id NOT NULL
Membership
(project_id, user_id) UNIQUE
Reactions
(post_id, user_id) UNIQUE
Documents
owner_id NOT NULL
Versions
(document_id, version_number) UNIQUE
50. Database Indexing

Critical indexes:

CREATE INDEX idx_documents_owner
ON documents(owner_id);

CREATE INDEX idx_documents_created
ON documents(created_at);

CREATE INDEX idx_projects_creator
ON projects(creator_id);

CREATE INDEX idx_project_members_user
ON project_members(user_id);

CREATE INDEX idx_tasks_project
ON tasks(project_id);

CREATE INDEX idx_messages_conversation
ON messages(conversation_id);

CREATE INDEX idx_messages_sender
ON messages(sender_id);

CREATE INDEX idx_notifications_user
ON notifications(user_id, is_read);

CREATE INDEX idx_reels_author
ON reels(author_id);

Don't blindly index every column. Index based on actual query patterns.

51. Transactions

Use PostgreSQL transactions for multi-step operations.

Example:

Create Project
      ↓
BEGIN
      ↓
Insert project
      ↓
Insert owner membership
      ↓
Create initial activity
      ↓
COMMIT

If one operation fails:

ROLLBACK
52. Soft Deletion

For important user content use:

deleted_at

rather than immediately deleting.

Recommended for:

documents
posts
comments
reels
projects

Then queries normally use:

WHERE deleted_at IS NULL
53. API Security
Required middleware
helmet
cors
rateLimit
cookieParser
requestId
authentication
authorization
validation
errorHandler
Rate limits

Different limits:

Login             → strict
Register          → strict
OTP               → very strict
AI                → strict
Search            → moderate
Read APIs         → moderate
Upload            → strict
Admin             → strict
54. Input Validation

Every external request should be validated.

Example:

POST /projects
      ↓
Zod schema
      ↓
valid?
 /    \
yes    no
 ↓      ↓
service 400

Never pass raw req.body directly into service/database operations.

55. File Security

For uploaded PDFs/media:

Extension validation
MIME validation
Magic-byte validation
Size limit
Virus scanning
Storage isolation
Signed URLs

Never allow:

../../etc/passwd

style paths.

Storage key must be generated server-side.

56. Secrets Management

Environment variables:

DATABASE_URL
REDIS_URL
JWT_SECRET
JWT_REFRESH_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
S3_ACCESS_KEY
S3_SECRET_KEY
GEMINI_API_KEY

Never commit:

.env

Never return secrets through API responses.

57. Logging

Use structured logs.

Example:

{
  "level": "info",
  "requestId": "req_123",
  "userId": "user_123",
  "route": "/api/v1/ai/ask",
  "duration": 1240,
  "status": 200
}

Never log:

password
JWT
refresh token
API key
OTP
58. Monitoring

Track:

API latency
5xx rate
4xx rate
DB connections
Redis health
AI latency
AI failures
RAG retrieval latency
queue depth
worker failures
storage failures

Health endpoints:

GET /health
GET /health/live
GET /health/ready

Public health endpoint should expose minimal information.

Detailed infrastructure metrics should require internal/admin access.

59. Error Architecture

Create standard errors:

ValidationError
AuthenticationError
AuthorizationError
NotFoundError
ConflictError
RateLimitError
ExternalServiceError
DatabaseError

HTTP mapping:

400 Validation
401 Authentication
403 Authorization
404 Not Found
409 Conflict
429 Rate Limit
500 Internal Server
503 Dependency Failure
60. API Versioning

Use:

/api/v1

Future:

/api/v2

Do not make breaking API changes inside /v1.

61. Caching Strategy

Redis should cache:

popular papers
recommendations
public profiles
search results
rate limits
OTP
temporary jobs

Example:

GET recommendations
        ↓
Redis?
   /       \
 HIT       MISS
 ↓          ↓
return    database/AI
             ↓
          Redis

Use short TTLs for dynamic data.

62. Research Recommendation Architecture
User Activity
      ↓
Saved Papers
      ↓
Viewed Papers
      ↓
Research Interests
      ↓
Projects
      ↓
Embedding/Profile
      ↓
Recommendation Engine
      ↓
Rank Papers
      ↓
Return Recommendations

Recommendation response should optionally explain:

"Recommended because you recently read papers about LLM evaluation."
63. Complete Backend User Journey
Journey: Upload → AI Summary
POST /assets/upload-url
          ↓
S3 upload
          ↓
POST /assets/register
          ↓
Create document
          ↓
Queue processing job
          ↓
PDF extraction
          ↓
Chunking
          ↓
Embedding
          ↓
Document READY
          ↓
POST /ai/summarize
          ↓
Authorization
          ↓
RAG/LLM
          ↓
Save AI result
          ↓
Return summary
64. Journey: Create Research Reel
POST /reels/generate-draft
          ↓
Authenticate
          ↓
Verify document access
          ↓
Create reel
status = processing
          ↓
Queue job
          ↓
Generate script
          ↓
Generate voice
          ↓
Generate video
          ↓
Upload media
          ↓
status = ready
          ↓
Notification
65. Journey: Collaborative Research
POST /projects
       ↓
Create project
       ↓
Create owner membership
       ↓
Invite researcher
       ↓
project_members
       ↓
Add documents
       ↓
Create tasks
       ↓
Assign tasks
       ↓
Activity events
       ↓
Notifications
66. Journey: Messaging
POST /messages/send
       ↓
Authenticate
       ↓
Verify participant
       ↓
sender_id = req.user.id
       ↓
INSERT message
       ↓
Redis event
       ↓
WebSocket
       ↓
Recipient
       ↓
Notification
67. Critical Security Requirements for Current ResearchReel

Based on the backend audit, these should be treated as P0/P1 fixes before production.

Issue	Priority	Required Fix
Workspace endpoints unauthenticated	🔴 P0	Require authentication
Admin routes unauthenticated	🔴 P0	Admin middleware
Project IDOR	🔴 P0	Resource authorization
Task update IDOR	🔴 P0	Verify project membership
Message conversation IDOR	🔴 P0	Verify participant
Client-controlled sender ID	🔴 P0	Derive from session
Document version IDOR	🔴 P0	Verify document access
Public profile SELECT u.*	🔴 P0	Explicit safe columns
AI document access	🔴 P1	Document authorization
Reel document access	🔴 P1	Document authorization
User analytics IDOR	🔴 P1	Use authenticated user
Billing checkout unauthenticated	🔴 P1	Require authentication
Client-controlled Stripe price	🔴 P1	Server-side plan mapping
Moderator can potentially assign admin	🔴 P1	Restrict role management
JWT in localStorage	🔴 P1	HttpOnly cookie-only
No refresh-token rotation	🟠 P1	Session table + rotation
Logout doesn't revoke tokens	🟠 P1	Server-side session revocation
Public health information	🟡 P2	Minimize production details
68. Recommended Final Backend Architecture

The production architecture should ultimately look like:

                         INTERNET
                            │
                            ▼
                         NGINX
                            │
                     ┌──────▼──────┐
                     │ Next.js UI  │
                     └──────┬──────┘
                            │
                            │ HTTPS
                            ▼
                  ┌────────────────────┐
                  │    API Gateway     │
                  │     Express        │
                  └─────────┬──────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
   Authentication       Core APIs         AI APIs
          │                 │                 │
          │                 │                 ▼
          │                 │           Python RAG
          │                 │                 │
          ▼                 ▼                 ▼
      PostgreSQL        PostgreSQL        Vector DB
          │
          ├──────── Redis ────────┐
          │                       │
          ▼                       ▼
      Sessions                 Job Queue
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
                AI Worker    Reel Worker   Document Worker
                    │             │             │
                    └─────────────┼─────────────┘
                                  ▼
                           Object Storage
                         PDFs / Videos / Media
69. Recommended Source-of-Truth Model

One important architectural rule:

Frontend
   ↓
requests intent

Backend
   ↓
decides authorization + business rules

Database
   ↓
enforces integrity

Redis
   ↓
accelerates / coordinates

Workers
   ↓
perform expensive asynchronous work

Object Storage
   ↓
stores binary assets

RAG Service
   ↓
performs retrieval + AI reasoning

The frontend should never be the source of truth for ownership, roles, permissions, subscription status, or identity.

70. Final ResearchReel Backend Product Loop

The backend ultimately supports this complete lifecycle:

                    RESEARCHREEL
                         │
                         ▼
                    DISCOVER
                         │
                         ▼
                      IMPORT
                         │
                         ▼
                       READ
                         │
                         ▼
                    PROCESS PDF
                         │
                         ▼
                  CHUNK + EMBED
                         │
                         ▼
                     RAG / AI
                    ↙    ↓    ↘
              SUMMARY   ASK   GAPS
                    \    │    /
                     UNDERSTAND
                         │
                         ▼
                     ORGANIZE
                         │
                   ┌─────┴─────┐
                   ▼           ▼
                PROJECTS     LIBRARY
                   │
                   ▼
                COLLABORATE
                   │
                   ▼
                CREATE REEL
                   │
                   ▼
                   SHARE
                   │
                   ▼
               SOCIAL FEED
                   │
                   ▼
             MORE DISCOVERY

This is the backend architecture I'd build around rather than treating ResearchReel as a collection of independent CRUD APIs. The core domain is the research document, and AI, collaboration, citations, reels, search, and social features should all connect back to that research object.

If you're turning this into actual implementation work, the next logical artifact is a third matching specification: API Contract + Database ERD + endpoint-by-endpoint request/response schemas. That would bridge this architecture directly to your existing frontend so a developer can implement the backend without guessing field names or API behavior.