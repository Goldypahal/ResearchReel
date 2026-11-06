# ResearchReel — System Architecture Blueprint

This document defines the production system architecture for **ResearchReel**, a research-centric social platform built to scale to **1M+ researchers, professors, and students**. 

Rather than building a monolith, ResearchReel utilizes a **Domain-Driven Microservices Architecture** from day one. This decoupled design ensures high availability, horizontal scalability, and rapid deployments across various research domains.

---

## 1. High-Level Architecture Diagram

The logical architecture consists of an API Gateway acting as a single entry point, routing client traffic to specific backend microservices. Communication is asynchronous and event-driven via Apache Kafka.

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

## 2. Core Service Directory & Boundaries

The system is decomposed into 15 domain services. Each service owns its database and has clear business boundaries.

### 2.1 Front-Facing Gateway
* **Gateway**: Route incoming HTTP/WebSocket traffic to respective backend services, enforce rate-limiting, and validate JWT authorization headers.

### 2.2 Core Services

1. **Authentication Service**
   * *Responsibilities*: User login, registration, email OTP verification, third-party logins (Google, LinkedIn, GitHub), JWT generation.
   * *Datastore*: PostgreSQL (`AuthDB`) + Redis (OTP / session caching).

2. **User Profile Service**
   * *Responsibilities*: Manage research interests, university affiliation, ORCID/GitHub handles, academic credentials, and follower statistics.
   * *Datastore*: PostgreSQL (`UserDB`).

3. **Research Paper Service**
   * *Responsibilities*: Handle PDF/document uploads, metadata parsing, version control, and DOI integrations.
   * *Datastore*: PostgreSQL (`PaperDB`) + MinIO/S3 Object Storage.

4. **Reel Service**
   * *Responsibilities*: Manage vertical video reels (30-60s), captions, likes, comments, and swipe tracking.
   * *Datastore*: PostgreSQL (`ReelDB`) + Object Storage.

5. **Video Processing Service**
   * *Responsibilities*: Transcode uploaded videos into multi-bitrate HLS (1080p, 720p, 480p, 360p), generate thumbnails, and run Whisper models for auto-captioning.
   * *Compute*: FFmpeg GPU worker pools.

6. **AI/RAG Service**
   * *Responsibilities*: Parse paper PDFs, chunk texts, generate embeddings, perform semantic search, and run RAG QA chats using LLMs (Qwen3/Llama).
   * *Datastore*: Qdrant Vector Database.

7. **Citation Intelligence Service**
   * *Responsibilities*: Construct reference knowledge graphs, identify supports/contradictions between papers, and output citation networks.
   * *Datastore*: Neo4j Graph DB.

8. **Recommendation Service**
   * *Responsibilities*: Build personal feed rankings based on viewed papers, watch-time data, and likes/comments.
   * *Datastore*: Redis (recommender cache) + Cassandra (historical events).

9. **Search Service**
   * *Responsibilities*: Power full-text search across authors, papers, datasets, patents, and institutions.
   * *Datastore*: Elasticsearch.

10. **Workspace Service**
    * *Responsibilities*: Enable Google Docs-style real-time collaborative writing, shared LaTeX documents, and project boards.
    * *Datastore*: MongoDB (`WorkspaceDB`).

11. **Chat Service**
    * *Responsibilities*: WebSocket-based instant messaging (1-on-1, group, and project rooms).
    * *Datastore*: MongoDB (`ChatDB`) + Redis Socket.IO Pub/Sub.

12. **Social Graph Service**
    * *Responsibilities*: Manage social relationships, followers, followings, and mentor-student nodes.
    * *Datastore*: Neo4j.

13. **Notification Service**
    * *Responsibilities*: Dispatch email digests, SMS OTPs, and Web Push notifications.
    * *Datastore*: Redis queue.

14. **Leaderboard Service**
    * *Responsibilities*: Track top-scoring researchers, trending reels, and most helpful peer-reviewers.
    * *Datastore*: Redis Sorted Sets.

15. **Analytics Service**
    * *Responsibilities*: Ingest billions of telemetry events (clickstreams, watch time) for product performance analysis.
    * *Datastore*: ClickHouse.

---

## 3. Database Architecture

To ensure strict database independence:
* **Relational Stores (PostgreSQL)** are used where transactional integrity is vital: `Auth Service`, `User Service`, `Paper Service`, and `Reel Service`.
* **Document Stores (MongoDB)** manage unstructured, collaborative models: `Workspace Service` and `Chat Service`.
* **Graph Databases (Neo4j)** store connections: `Citation Service` and `Social Graph Service`.
* **Vector Databases (Qdrant)** store high-dimensional embeddings: `AI/RAG Service`.
* **Columnar Datastores (ClickHouse)** handle big data aggregations: `Analytics Service`.
* **In-Memory Caches (Redis)** store OTP verification keys, leaderboards, and session configurations.

---

## 4. Event-Driven Messaging (Kafka Topology)

Microservices communicate asynchronously via Kafka topics. 

```text
User Uploaded Paper
           ↓
    [Kafka Topic: paper-uploads]
           ↓
-----------------------------------------------------------
|                  |                   |                  |
AI/RAG Svc     Search Svc         Feed Svc         Analytics Svc
(Vectorizes)  (Indexes Text)  (Notifies Followers) (Tracks Telemetry)
```

---

## 5. Development Monorepo Mapping

To ease development while building separate services, the repository uses a monorepo structure:
* `frontend/` - Next.js client application.
* `gateway/` - Nginx / Express routing gateway.
* `services/` - Main microservices directory:
  * `services/auth-service/`
  * `services/user-service/`
  * `services/paper-service/`
  * `services/reel-service/`
  * `services/video-worker/`
  * `services/rag-service/`
  * `services/citation-service/`
  * `services/recommendation-service/`
  * `services/search-service/`
  * `services/workspace-service/`
  * `services/chat-service/`
  * `services/social-service/`
  * `services/notification-service/`
  * `services/leaderboard-service/`
  * `services/analytics-service/`
* `k8s/` - Kubernetes manifests for production deployment.
* `terraform/` - IaC for AWS VPC, EKS Cluster, and resource groups.
