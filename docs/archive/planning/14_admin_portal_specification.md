# ResearchReel — Enterprise Admin Portal Specification

This document details the admin portal (`/mod`), providing internal metrics dashboards, moderation queues, feature flags management, and operational logging.

---

## 1. Operational Dashboards

### 1.1 Moderation Queue
* **Purpose**: Allows moderators to review posts reported for plagiarism, offensive content, or copyright issues.
* **UI Elements**: List card layout displaying reported content previews, reporter comments, target author profiles, and action buttons.
* **Actions**:
  * `btn-resolve-report-dismiss`: Closes report with status `dismissed`.
  * `btn-resolve-report-ban`: Hides target content, flag author account.
* **Auditing**: Writes action detail, moderator ID, and target ID to `audit_logs`.

### 1.2 User Verification Queue
* **Purpose**: Reviews student email domains and ORCID callback requests to upgrade user tier badges.
* **Actions**: Approve (assigns Student or Scholar badge) or Reject verification request.

---

## 2. Admin APIs (`/api/v1/moderation`)
* **`GET /reports`**: Lists pending moderation items. Requires role `moderator` or `admin`.
* **`POST /reports/:id/resolve`**: Performs resolution actions.
* **`GET /health`**: Returns cluster health logs.
* **`POST /feature-flags`**: Enforces/toggles platform feature flags.

---

## 3. Feature Flags Console
* **Toggles Managed**:
  * `ai-reel-generation-v2`: Routes transcoding requests to the new GPU rendering queue.
  * `stripe-enforce-limits`: Gates RAG and creation pipelines based on active credits.
  * `plagiarism-scan-active`: Triggers automated cross-checks during paper uploads.
