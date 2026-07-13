# ResearchReel — Media Asset Management System (AMS)

This document specifies the Media Asset Management System (AMS) for ResearchReel V1.0 Enterprise, detailing the storage architecture, CDN strategies, metadata schemas, and permissions structures.

---

## 1. Storage Architecture
AMS manages all static assets (PDFs, images, transcode outputs, audio recordings, subtitle files) using a multi-bucket S3 structure:
* **`rr-staging-uploads`**: Short-term storage for raw user uploads (ClamAV scans run here).
* **`rr-production-assets`**: Read-only bucket for verified documents, slide assets, and video transcodes.
* **`rr-temporary-cache`**: Storage for temporary TTS audio renders and intermediate video sequences.

---

## 2. Cloudflare CDN Integration & Cache Strategy
All file delivery routes go through Cloudflare CDN to optimize load speeds:
* **Cache Key Rules**: Cache keys combine file paths and version strings (e.g. `/media/video_123.mp4?v=2`).
* **Cache-Control Headers**:
  * Video segments (`.ts` files): Cached for 1 year (`public, max-age=31536000, immutable`).
  * Index files (`.m3u8` playlists): Cached for 2 seconds (`public, max-age=2`).
  * User PDFs: Delivery uses signed URLs with 15-minute expirations to protect access.

---

## 3. Metadata Structure (PostgreSQL)

```sql
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID, -- Optional workspace link
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  s3_bucket VARCHAR(100) NOT NULL,
  s3_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- e.g. { "duration": 40, "dimensions": "1080x1920" }
  tags TEXT[] DEFAULT '{}'::text[],
  is_favorite BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Access Permissions Matrix

| Asset Class | Storage Target | Access Rule | CDN Cache Route |
| :--- | :--- | :--- | :--- |
| **Research Paper (PDF)** | Private S3 Bucket | Presigned S3 URLs; requires workspace access check | Private; bypass cache |
| **Published Reels (HLS)**| Public S3 Bucket | Open access (anonymous) | Public; Cache-Control headers |
| **Voiceover Audio (MP3)**| Private S3 Bucket | Restricted to author and editor | Private |
| **User Profile Images** | Public S3 Bucket | Open access | Public |

---

## 5. Retention & Trash Policies
* **Soft Delete (Trash)**: Deleting assets sets `is_deleted = TRUE` and updates `deleted_at`. Files remain in trash for 30 days.
* **Hard Delete**: Cron jobs run every night, permanently purging assets from S3 buckets if their `deleted_at` timestamp is older than 30 days.
* **Auto-clean Temporary Buckets**: Files in `rr-temporary-cache` are deleted automatically after 24 hours.
