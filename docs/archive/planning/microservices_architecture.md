# ResearchReel — Domain-Driven Microservices Architecture Blueprint

This document details the transition of **ResearchReel** from a monolithic/gateway structure to a fully decoupled, **Domain-Driven Microservices Architecture** designed to scale to **1M+ researchers, professors, and students** (100K concurrent users, 10M videos, 100M papers, and billions of AI queries).

---

## 1. System Overview & Core Principles

To support a high-volume, collaborative academic social platform, the system is designed around:
1. **Domain-Driven Design (DDD)**: Each microservice owns its business domain, data models, and database schema, ensuring clear boundaries.
2. **Event-Driven Communication (Kafka)**: Non-blocking asynchronous event propagation prevents service coupling.
3. **Database Per Service**: No two services share a database directly, eliminating data-layer coupling.
4. **Polyglot Persistence**: The storage engines are chosen to match the read/write patterns and structure of the data (relational, document, graph, search, vector, column).

---

## 2. High-Level Architecture Diagram

```text
                               INTERNET
                                   |
                             Cloudflare CDN
                                   |
                             Load Balancer
                                   |
                            Nginx API Gateway
                                   |
    ---------------------------------------------------------------------------------
    |           |            |            |            |            |               |
  Auth        User        Research      Reel         Video          AI            Citation
 Service     Service      Paper Svc    Service     Processing     Service       Intelligence
    |           |            |            |            |            |               |
 PostgreSQL  PostgreSQL   PostgreSQL   PostgreSQL    FFmpeg       Qdrant          Neo4j
  + Redis                  + S3         + S3        GPU Workers  Vector DB       Graph DB
    |           |            |            |            |            |               |
    ---------------------------------------------------------------------------------
                                   |
                             Event Bus (Kafka)
                                   |
    ---------------------------------------------------------------------------------
    |           |            |            |            |            |               |
 Recommend.   Search      Workspace      Chat       Social    Notification     Leaderboard
  Service    Service       Service      Service      Graph       Service         Service
    |           |            |            |            |            |               |
 Redis +    Elasticsearch  MongoDB      MongoDB      Neo4j       Redis +         Redis +
 Cassandra                                          Graph DB     Nodemailer      PostgreSQL
    |           |            |            |            |            |               |
    ---------------------------------------------------------------------------------
                                   |
                           Analytics Service
                                   |
                           Kafka + ClickHouse
```

---

## 3. Core Services Decomposition

### 3.1 Authentication Service
* **Domain**: Identity and Access Management (IAM), Session Control, User Enrollment.
* **Tech Stack**: Spring Boot / Keycloak, PostgreSQL (`AuthDB`), Redis (OTP & active session caching).
* **Datastore Tables**:
  * `users`: Identity records, email status, password hashes (Argon2), credentials.
  * `roles`: Role definitions (Student, Scholar, Faculty, Moderator, Admin).
  * `sessions`: JWT session records, login history.
  * `tokens`: Refresh tokens, password reset tokens, OTP markers.

### 3.2 User Profile Service
* **Domain**: Researcher professional identity, biography, interests, and affiliations.
* **Tech Stack**: Node.js / Express, PostgreSQL (`UserDB`).
* **Datastore Fields**:
  * Research interests (ML, Quantum Computing, Aerospace, etc.), university, skills, ORCID identifier, LinkedIn, GitHub, citations tally, verification tier.

### 3.3 Research Paper Service
* **Domain**: Paper uploads, versions, metadata, DOIs, licensing.
* **Tech Stack**: Node.js, PostgreSQL (`PaperDB`), MinIO / AWS S3 / Azure Blob.
* **Datastore Tables**:
  * `documents`: Upload metadata, local files references, original filenames.
  * `paper_versions`: Document history and PDFs, draft states.
  * `paper_metadata`: DOI verification status, authors list, categories.

### 3.4 Reel Service
* **Domain**: Social vertical videos (30-60s), captions, thumbnails, engagement counters.
* **Tech Stack**: Node.js, PostgreSQL (`ReelDB`), AWS S3 + Cloudflare CDN.
* **Datastore Tables**:
  * `reels`: Video URLs, thumbnail URLs, transcripts, durations, categories.
  * `reel_engagement`: View counts, unique watchers, retention logs.

### 3.5 Video Processing Service
* **Domain**: Compute-heavy video transcoding, thumbnail extraction, auto-captioning.
* **Tech Stack**: Python (FFmpeg bindings, GPU Workers), BullMQ/Kafka for triggers.
* **Pipeline**:
  1. Upload raw `.mp4` or `.mov` (up to 200MB) to S3 Staging.
  2. Transcode into multi-bitrate HLS (360p, 480p, 720p, 1080p).
  3. Extract representative thumbnail image.
  4. Generate Whisper auto-captions with timestamps.
  5. Save resources to S3 Production bucket and notify Reel Service.

### 3.6 AI/RAG Service
* **Domain**: Document analysis, semantic Q&A, citation explanation, automated literature review generation.
* **Tech Stack**: FastAPI (Python), Qwen3 / Llama, Qdrant Vector Database.
* **Pipeline**:
  1. Parse PDF/DOCX using PyMuPDF / Grobid.
  2. Chunk texts recursively with overlap windowing.
  3. Generate embeddings using `text-embedding-3-large`.
  4. Insert vectors into Qdrant index.
  5. Answer user queries by fetching Top-K chunks and injecting them into the LLM context window.

### 3.7 Citation Intelligence Service
* **Domain**: Knowledge graphs, bibliographic linkages, citation consensus detection.
* **Tech Stack**: Java / Python, Neo4j Graph DB, CrossRef API.
* **Graph Schema Nodes & Relationships**:
  * Nodes: `(:Paper {doi, title})`, `(:Author {name, orcid})`.
  * Relationships: `(p1:Paper)-[:CITES {type: "contradicts" | "supports" | "neutral"}]->(p2:Paper)`.

### 3.8 Recommendation Service
* **Domain**: Personalized algorithmic feeds (home and explore).
* **Tech Stack**: Python (PyTorch, GNNs), Redis (recommender outputs), Cassandra (historical clicks).
* **Models**: Collaborative filtering, Graph Neural Networks (GNNs), watch-time-based reinforcement ranker.

### 3.9 Search Service
* **Domain**: High-speed keyword and semantic search.
* **Tech Stack**: Elasticsearch / OpenSearch, Logstash / Kafka.
* **Indexes**: `papers`, `authors`, `universities`, `patents`, `datasets`.

### 3.10 Workspace Service
* **Domain**: Real-time collaborative research workspaces, shared notes, LaTeX editors, kanban project management.
* **Tech Stack**: Node.js, MongoDB (`WorkspaceDB`), Yjs/Automerge (CRDTs).
* **Datastore Collections**:
  * `projects`, `notes`, `annotations`, `kanban_boards`, `version_histories`.

### 3.11 Chat Service
* **Domain**: Real-time 1-on-1, group, and project-level messaging.
* **Tech Stack**: Node.js / Socket.IO, Redis (pub/sub), MongoDB (`ChatDB`).
* **Datastore Collections**:
  * `conversations`: Participant list, group settings.
  * `messages`: Content, sender ID, read receipts, attachments.

### 3.12 Social Graph Service
* **Domain**: Followers, followings, academic mentorship linkages, co-author connections.
* **Tech Stack**: Node.js, Neo4j Graph DB.
* **Graph Schema**:
  * `(u1:User)-[:FOLLOWS]->(u2:User)`
  * `(u1:User)-[:MENTORS]->(u2:User)`

### 3.13 Notification Service
* **Domain**: Alert dispatching (in-app, push, email, SMS).
* **Tech Stack**: Node.js, Redis Queue (BullMQ), Nodemailer, Twilio, Firebase Cloud Messaging (FCM).

### 3.14 Leaderboard Service
* **Domain**: Scoring of top researchers, helpful reviewers, trending reels, top institutions.
* **Tech Stack**: Go / Node.js, Redis Sorted Sets, PostgreSQL cache.

### 3.15 Analytics Service
* **Domain**: Tracking clickstream data, watch times, retention rates, search trends.
* **Tech Stack**: Kafka, ClickHouse OLAP Database.

---

## 4. Event-Driven Backbone (Kafka Topology)

Kafka acts as the central nervous system. When an event occurs, it is published to a topic, and interested services consume it asynchronously.

### Core Topics & Schemas

| Topic Name | Producer Service | Consumer Services | Payload Description |
| :--- | :--- | :--- | :--- |
| `user-registered` | Auth Service | User Profile, Notification | `{ "userId": "...", "email": "...", "name": "..." }` |
| `paper-uploaded` | Research Paper Svc | AI/RAG, Search, Notification | `{ "paperId": "...", "s3Url": "...", "doi": "..." }` |
| `reel-uploaded` | Reel Service | Video Processing | `{ "reelId": "...", "stagingS3Url": "..." }` |
| `video-processed` | Video Processing | Reel Service, Search, Feed | `{ "reelId": "...", "transcodedUrl": "...", "captions": [...] }` |
| `citation-created` | Citation Svc | Notification, Leaderboard | `{ "citingDoi": "...", "citedDoi": "...", "type": "supports" }` |
| `user-interaction` | Gateway / Frontend | Analytics, Recommendation | `{ "userId": "...", "itemId": "...", "action": "watch_time", "val": 45 }` |

---

## 5. Storage Topology

```text
Datastore         | Dedicated Microservice(s)             | Rationale
------------------+---------------------------------------+---------------------------------------------
PostgreSQL        | Auth, User Profile, Paper, Reel       | Strict ACID transactions, structured data
MongoDB           | Workspace, Chat                       | Dynamic document models, nested structures
Neo4j Graph DB    | Citation Intelligence, Social Graph   | Deep connection queries, knowledge graphs
Elasticsearch     | Search                                | High-speed inverted index search, synonyms
Qdrant Vector DB  | AI/RAG                                | Fast cosine/dot-product embedding search
Cassandra         | Recommendation (historical events)    | Ultra-fast sequential writes, high-volume reads
ClickHouse        | Analytics                             | Columnar storage optimized for OLAP aggregations
Redis             | Caching, Leaderboards, Rate-Limiting  | In-memory key-value data structures
```

---

## 6. Architecture for 1 Million Researchers (Scaling Blueprint)

### 6.1 Capacity & Infrastructure Requirements
* **Registered Users**: 1,000,000
* **Daily Active Users (DAU)**: ~150,000
* **Concurrent Users (Peak)**: 100,000
* **Video Files (Reels)**: 10,000,000 (~50TB storage with multi-bitrate encodes)
* **Research Papers**: 100,000,000 (~300TB PDF storage + vector index storage)

### 6.2 Cluster Allocation Matrix
To support this scale, the Kubernetes (EKS) cluster runs with the following resource distribution:

* **50 API Gateway Nodes**: Reverse proxying, routing, SSL termination, and rate-limiting.
* **20 Auth Instances (Keycloak/Spring Boot)**: Handling active token refreshes.
* **40 Reel Streams Nodes**: Streaming HLS, managing vertical swiping and view states.
* **50 AI/RAG Nodes**: Running PyMuPDF parsing and semantic retriever orchestration.
* **20 Search Nodes**: Elastic search instances maintaining the document indices.
* **10 Kafka Brokers**: Distributed across 3 availability zones with partition count = 12 per topic.
* **10 Redis Nodes**: Clustered for session caching, OTP cache, and leaderboard sorted sets.
* **20 PostgreSQL Replicas**: 1 primary (writes) and 19 read replicas configured with PgBouncer.
* **10 Elasticsearch Data Nodes**: Running primary/replica shards (5 primary, 2 replicas).
* **20 GPU Nodes (e.g., AWS g5.2xlarge)**: Powering video transcoding, Whisper transcription, and local LLM embeddings.
