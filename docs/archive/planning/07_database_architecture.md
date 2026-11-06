# ResearchReel — Production Database Architecture & ERD Specification

This document details the database architecture for ResearchReel V1.0 Enterprise. It specifies the PostgreSQL relational DDL, the MongoDB workspace document structures, the Neo4j citation graph nodes, and the Qdrant vector index configurations.

---

## 1. Database Engines Strategy
* **PostgreSQL (Primary Core)**: Stores users, settings, files metadata, and transactions.
* **MongoDB (Workspaces & Editor States)**: Stores flexible workspaces, Kanban card details, and real-time chat histories.
* **Neo4j (Academic Knowledge Graph)**: Maps relationships between authors and papers.
* **Qdrant (Vector Datastore)**: Stores paper chunk embeddings for RAG lookups.

---

## 2. PostgreSQL Relational DDL Schema

```sql
-- DDL Schema for PostgreSQL (ResearchReel V1.0 Enterprise)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100),
  bio TEXT,
  profile_picture_url TEXT,
  verification_status VARCHAR(20) DEFAULT 'unverified', -- 'unverified', 'student', 'scholar', 'faculty', 'admin'
  orcid_id VARCHAR(19) UNIQUE,
  research_interests TEXT[],
  stripe_customer_id VARCHAR(100) UNIQUE,
  subscription_tier VARCHAR(20) DEFAULT 'free', -- 'free', 'pro', 'business', 'enterprise'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 3. Documents (Research Material)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploader_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_url TEXT NOT NULL,
  summary_text TEXT,
  key_points TEXT[],
  doi VARCHAR(255),
  version INT DEFAULT 1,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Document Version History (Track modifications)
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  file_url TEXT NOT NULL,
  changes_summary TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Videos (Reels)
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  hls_playlist_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INT CHECK (duration_seconds BETWEEN 30 AND 60),
  linked_paper_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  timestamps JSONB,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Reel Drafts
CREATE TABLE IF NOT EXISTS reel_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  linked_paper_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  scenes JSONB NOT NULL, -- JSON array of scenes script and visuals
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'rendering', 'published', 'failed'
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Billing Transactions
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(100) UNIQUE,
  amount_cents INT NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'paid', 'pending', 'failed'
  invoice_pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  ip_address VARCHAR(45),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance scale
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_documents_uploader ON documents(uploader_id);
CREATE INDEX idx_documents_doi ON documents(doi);
CREATE INDEX idx_videos_author ON videos(author_id);
CREATE INDEX idx_reel_drafts_author ON reel_drafts(author_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
```

---

## 3. MongoDB Document Schemas

### 3.1 Workspaces Collection
```json
{
  "_id": "ObjectId",
  "name": "Quantum Physics Lab",
  "organizationId": "String",
  "members": [
    { "userId": "String", "role": "admin"|"editor"|"viewer" }
  ],
  "createdAt": "ISODate"
}
```

### 3.2 Kanban Cards Collection
```json
{
  "_id": "ObjectId",
  "workspaceId": "ObjectId",
  "title": "Revise Chapter 3 Equations",
  "description": "Ensure LaTeX renders correctly on mobile viewport",
  "status": "todo"|"in_progress"|"done",
  "assigneeId": "String",
  "dueDate": "ISODate",
  "comments": [
    { "userId": "String", "text": "Will look at this tonight.", "createdAt": "ISODate" }
  ]
}
```

---

## 4. Neo4j Citation Graph Schema
* **Node `(:Paper)`**: `{ doi: "10.1145/...", title: "...", publishedYear: 2026 }`
* **Node `(:Author)`**: `{ orcid: "0000-0000-0000-0000", name: "Dr. Alice Smith" }`
* **Relationship `(a:Author)-[:AUTHORED]->(p:Paper)`**
* **Relationship `(p1:Paper)-[:CITES {sentiment: "contradicts"|"supports"|"neutral"}]->(p2:Paper)`**

---

## 5. Qdrant Vector Collection Specifications
* **Collection Name**: `research_paper_embeddings`
* **Vector Configuration**:
  * Dimension size: 1536 (matching `text-embedding-3-large`).
  * Similarity metric: Cosine.
* **Payload Fields**:
  ```json
  {
    "document_id": "uuid-string",
    "section_title": "Methodology",
    "page_number": 12,
    "chunk_text": "The experimental validation utilized cryogenic shielding..."
  }
  ```
* **Indexes**: HNSW (Hierarchical Navigable Small World) index configured on payload field `document_id`.
