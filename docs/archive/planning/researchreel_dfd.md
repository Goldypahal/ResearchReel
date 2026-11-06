# ResearchReel — Data Flow Diagrams

> Derived from **ResearchReel_SRS_v1.0 (April 2, 2026)**
>
> See also: `docs/architecture.md` for the project-level architecture blueprint and component mapping.

---

## DFD Level 0 — System Context Diagram

```mermaid
flowchart TD
    U1([Researcher / Scholar])
    U2([Student])
    U3([General Public])
    U4([Industry R&D])
    EA1([ORCID API])
    EA2([Google Scholar])
    EA3([Claude 3.5 API])
    EA4([AWS S3 / CDN])
    EA5([CrossRef API])
    EA6([Perspective API])

    subgraph RR["ResearchReel Platform"]
        direction TB
        CORE["Core System"]
    end

    U1 <-->|Upload reels, posts, docs - View feed| RR
    U2 <-->|View and interact - Student verification| RR
    U3 <-->|View research content - Search| RR
    U4 <-->|Collaboration and ads| RR
    RR <-->|OAuth + Publication data| EA1
    RR <-->|Citation and profile sync| EA2
    RR <-->|Summarization, Q&A, scripts| EA3
    RR <-->|Store and serve videos, docs, images| EA4
    RR <-->|DOI verification| EA5
    RR <-->|Content moderation| EA6
```

---

## DFD Level 1 — Major Subsystems

```mermaid
flowchart TD
    USER([User])

    subgraph AUTH["1. Auth and Verification"]
        A1[Register / Login]
        A2[JWT Token Manager]
        A3[ORCID OAuth]
        A4[Student ID Verifier]
    end

    subgraph FEED["2. Feed and Content"]
        F1[Post Creator]
        F2[Feed Generator]
        F3[Engagement Engine]
        F4[Bookmark Manager]
    end

    subgraph REELS["3. Reels / Video Engine"]
        R1[Video Uploader]
        R2[Video Processor FFmpeg]
        R3[Reels Feed Streamer]
        R4[Interactive Timestamps]
    end

    subgraph MSG["4. Messaging / Real-Time"]
        M1[Conversation Manager]
        M2[Socket.IO Server]
        M3[File Share Handler]
        M4[Group Chat Manager]
    end

    subgraph DOCS["5. Document Management"]
        D1[Document Uploader]
        D2[Document Renderer]
        D3[Annotation Engine]
        D4[Version Control]
    end

    subgraph AI["6. AI Services"]
        AI1[Summarizer]
        AI2[RAG Q&A Engine]
        AI3[Recommendation Engine]
        AI4[Video Script Generator]
    end

    subgraph MOD["7. Moderation and Safety"]
        MOD1[Pre-Upload Scanner]
        MOD2[Plagiarism Detector]
        MOD3[Report Queue Manager]
        MOD4[Penalty System]
    end

    subgraph DB["Data Layer"]
        DB1[(PostgreSQL)]
        DB2[(Redis Cache)]
        DB3[(Qdrant Vector DB)]
        DB4[(Elasticsearch)]
        DB5[(AWS S3)]
    end

    USER -->|Credentials| AUTH
    AUTH -->|Token| USER
    USER -->|Create/View posts| FEED
    USER -->|Upload/Watch video| REELS
    USER -->|Send messages| MSG
    USER -->|Upload/Read docs| DOCS
    DOCS -->|Trigger summary| AI
    REELS -->|Trigger processing| AI
    FEED -->|Query personalization| AI
    FEED --> MOD
    REELS --> MOD
    DOCS --> MOD

    AUTH --- DB1
    FEED --- DB1
    FEED --- DB2
    REELS --- DB5
    MSG --- DB1
    DOCS --- DB1
    DOCS --- DB5
    AI --- DB3
    FEED --- DB4
```

---

## DFD Level 2 — Authentication and Verification Flow

```mermaid
sequenceDiagram
    actor User
    participant App
    participant AuthService
    participant DB as PostgreSQL
    participant ORCID
    participant Email

    User->>App: Register with email and password
    App->>AuthService: POST /api/auth/register
    AuthService->>DB: Check email uniqueness
    DB-->>AuthService: OK
    AuthService->>DB: INSERT user unverified
    AuthService->>Email: Send verification code
    Email-->>User: Verification email
    User->>App: Enter code
    App->>AuthService: POST /api/auth/verify-email
    AuthService->>DB: Update email_verified = true

    alt Scholar Verification
        User->>App: Link ORCID
        App->>ORCID: OAuth 2.0 redirect
        ORCID-->>App: Access token and profile
        App->>AuthService: POST /api/auth/oauth/orcid
        AuthService->>DB: Fetch publications and affiliations
        AuthService->>Email: Send institutional email code
        Email-->>User: Confirmation code
        User->>App: Confirm code
        AuthService->>DB: SET verification_status = scholar gold badge
    else Student Verification
        User->>App: Upload student ID images
        App->>AuthService: POST student ID
        AuthService->>AuthService: OCR extract name/university/ID
        AuthService->>Email: Send to faculty for approval
        Note over AuthService: Faculty approves within 48h
        AuthService->>DB: SET verification_status = student blue badge
    end
```

---

## DFD Level 2 — Video Upload and Processing Pipeline

```mermaid
flowchart LR
    U([User])
    UP[Video Upload Handler]
    VAL{Validate 30-60s less than 200MB MP4/MOV}
    S3S[(S3 Staging Bucket)]
    LAMBDA[Lambda Function]
    FFMPEG[FFmpeg Transcoder]
    WHISPER[Whisper Caption API]
    THUMB[Thumbnail Extractor]
    HLS[HLS Manifest Generator]
    S3P[(S3 Production + CDN)]
    DB[(PostgreSQL)]
    NOTIF[Push Notification]

    U -->|multipart upload| UP
    UP --> VAL
    VAL -->|Rejected| U
    VAL -->|Valid| S3S
    S3S --> LAMBDA
    LAMBDA --> FFMPEG
    FFMPEG -->|1080p 720p 480p| HLS
    LAMBDA --> THUMB
    LAMBDA --> WHISPER
    WHISPER -->|Auto-captions| S3P
    THUMB --> S3P
    HLS --> S3P
    S3P --> DB
    DB --> NOTIF
    NOTIF --> U
```

---

## DFD Level 2 — AI Document Q&A RAG Pipeline

```mermaid
flowchart TD
    U([User])
    DU[Document Upload]
    PARSE[PyMuPDF / Grobid Parser]
    CHUNK[Text Chunker]
    EMBED[Embedding Model text-embedding-3-large]
    VDB[(Qdrant Vector DB)]
    QA_IN[User Question Input]
    RETRIEVE[Semantic Retriever]
    CONTEXT[Context Builder]
    LLM[Claude 3.5 Sonnet]
    ANS[Answer with Citations]
    HIST[(Conversation History)]

    U -->|Upload PDF or DOCX| DU
    DU --> PARSE
    PARSE --> CHUNK
    CHUNK --> EMBED
    EMBED --> VDB

    U -->|Ask question| QA_IN
    QA_IN --> RETRIEVE
    VDB -->|Top-K chunks| RETRIEVE
    RETRIEVE --> CONTEXT
    HIST --> CONTEXT
    CONTEXT --> LLM
    LLM --> ANS
    ANS --> U
    ANS --> HIST
```

---

## DFD Level 2 — Feed Generation and Recommendation

```mermaid
flowchart TD
    U([User])
    REDIS[(Redis Cache Feed TTL 10min)]
    PG[(PostgreSQL)]
    ES[(Elasticsearch)]
    QDRANT[(Qdrant Embeddings)]
    FG[Feed Generator]
    RANK[Quality Ranker]
    ALGO{Cache Hit?}
    EXPLORE[Explore / Trending Feed]
    PERSONALIZE[Personalization Engine]
    ADS[Ad Injection Every 5th post]
    RES[Feed Response 20 posts per page]

    U -->|GET /api/feed/home| FG
    FG --> ALGO
    ALGO -->|Yes| REDIS
    REDIS --> RES
    ALGO -->|No| PG
    PG -->|Followed users posts| RANK
    QDRANT -->|Interest similarity| PERSONALIZE
    RANK --> PERSONALIZE
    PERSONALIZE --> ADS
    ADS --> REDIS
    ADS --> RES
    RES --> U

    U -->|GET /api/feed/explore| EXPLORE
    ES -->|Full-text trending search| EXPLORE
    EXPLORE --> U
```

---

## DFD Level 2 — Real-Time Messaging Socket.IO

```mermaid
sequenceDiagram
    actor UserA
    actor UserB
    participant Socket as Socket.IO Server
    participant API as Express API
    participant DB as PostgreSQL
    participant Redis

    UserA->>Socket: connect with JWT auth
    Socket->>Redis: Store socket session
    UserA->>Socket: emit send_message to UserB
    Socket->>DB: INSERT message
    Socket->>UserB: emit new_message event

    UserB->>Socket: emit typing event
    Socket->>UserA: emit user_typing event

    UserB->>Socket: emit message_read event
    Socket->>DB: UPDATE read_at
    Socket->>UserA: emit message_seen event

    UserA->>API: POST /api/messages/upload file
    API->>DB: Store file metadata
    API->>Socket: Broadcast file_message event
    Socket->>UserB: emit new_message with file url
```

---

## DFD Level 2 — Content Moderation Pipeline

```mermaid
flowchart TD
    U([User])
    UP[Upload Post or Video or Document]
    PRE{Pre-Upload Checks}
    SPAM[Spam Detector]
    PROF[Profanity Filter]
    MAL[Malware Scanner]
    ACCEPT[Accept to S3]
    REJECT[Reject and Notify User]
    POST{Post-Upload Analysis}
    PLAG[Plagiarism Detector]
    IMG[Image Moderation Perspective API]
    CITE[Citation Verifier CrossRef]
    FLAG[Flag Content Warning]
    PUB[Publish to Feed]
    REPORT[Community Report]
    QUEUE[Moderator Review Queue]
    ACTION{Decision}
    WARN[Warning Email]
    SUSP[7-day Suspension]
    BAN[Permanent Ban plus Institution Notify]

    U --> UP
    UP --> PRE
    PRE --> SPAM
    PRE --> PROF
    PRE --> MAL
    SPAM -->|Detected| REJECT
    PROF -->|Detected| REJECT
    MAL -->|Detected| REJECT
    SPAM -->|Clean| ACCEPT
    PROF -->|Clean| ACCEPT
    MAL -->|Clean| ACCEPT
    REJECT --> U
    ACCEPT --> POST
    POST --> PLAG
    POST --> IMG
    POST --> CITE
    PLAG -->|Detected| FLAG
    IMG -->|Inappropriate| FLAG
    CITE -->|Uncredited| FLAG
    FLAG --> QUEUE
    PLAG -->|Clean| PUB
    IMG -->|Clean| PUB
    CITE -->|Clean| PUB
    PUB --> U

    U -->|Report button| REPORT
    REPORT --> QUEUE
    QUEUE --> ACTION
    ACTION -->|1st offense| WARN
    ACTION -->|2nd offense| SUSP
    ACTION -->|3rd offense| BAN
```

---

## Database Entity Relationship Overview

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email
        varchar username
        varchar full_name
        text bio
        varchar verification_status
        varchar orcid_id
        uuid institution_id FK
        timestamp created_at
    }

    INSTITUTIONS {
        uuid id PK
        varchar name
        varchar domain
        varchar logo_url
    }

    POSTS {
        uuid id PK
        uuid author_id FK
        varchar content_type
        text caption
        uuid document_id FK
        varchar publication_status
        varchar doi
        timestamp created_at
    }

    VIDEOS {
        uuid id PK
        uuid author_id FK
        varchar title
        text video_url
        text thumbnail_url
        int duration_seconds
        uuid linked_paper_id FK
        timestamp created_at
    }

    DOCUMENTS {
        uuid id PK
        uuid uploader_id FK
        varchar file_type
        text file_url
        text summary_text
        timestamp created_at
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        text content
        varchar message_type
        text file_url
        timestamp sent_at
        timestamp read_at
    }

    REACTIONS {
        uuid id PK
        uuid post_id FK
        uuid user_id FK
        varchar reaction_type
    }

    FOLLOWS {
        uuid follower_id FK
        uuid following_id FK
        timestamp created_at
    }

    USERS ||--o{ POSTS : "authors"
    USERS ||--o{ VIDEOS : "creates"
    USERS ||--o{ DOCUMENTS : "uploads"
    USERS ||--o{ MESSAGES : "sends"
    USERS ||--o{ REACTIONS : "reacts"
    USERS }o--|| INSTITUTIONS : "belongs to"
    POSTS ||--o{ REACTIONS : "receives"
    DOCUMENTS ||--o{ POSTS : "attached to"
    DOCUMENTS ||--o{ VIDEOS : "linked paper"
```

---

## Infrastructure Architecture

```mermaid
flowchart TB
    subgraph CLIENT["Clients"]
        MOB[Flutter Mobile App]
        WEB[Next.js Web App]
    end

    subgraph API_LAYER["API Layer"]
        EXPRESS[Node.js / Express API]
        SOCKET[Socket.IO Server]
    end

    subgraph AI_LAYER["AI Services"]
        CLAUDE[Claude 3.5 Sonnet]
        EMBED[text-embedding-3-large]
        MISTRAL[Mistral 7B Fallback]
        WHISPER[Whisper Captions]
        FFMPEG[FFmpeg Video Processing]
    end

    subgraph DB_LAYER["Data Layer"]
        PG[(PostgreSQL 16)]
        REDIS[(Redis Cache)]
        QDRANT[(Qdrant Vector DB)]
        ELASTIC[(Elasticsearch)]
        S3[(AWS S3 + CDN)]
    end

    MOB <-->|REST + WebSocket| API_LAYER
    WEB <-->|REST + WebSocket| API_LAYER
    EXPRESS <-->|Queries| PG
    EXPRESS <-->|Cache| REDIS
    EXPRESS <-->|Vector search| QDRANT
    EXPRESS <-->|Full-text search| ELASTIC
    EXPRESS <-->|Media storage| S3
    EXPRESS <-->|AI calls| AI_LAYER
    SOCKET <-->|Real-time events| REDIS
```
