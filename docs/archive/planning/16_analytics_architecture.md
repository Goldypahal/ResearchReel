# ResearchReel — Production Analytics & Telemetry Architecture

This document specifies the event pipelines, clickstream telemetry structures, and analytics dashboards for ResearchReel V1.0 Enterprise.

---

## 1. Analytics Data Flow

```text
       Client Interface (Web/Mobile)
                     │
            User Interaction Event
                     │
          [API Gateway Telemetry API]
                     │
             [Kafka Topic] (user-telemetry)
                     │
            [ClickHouse Database] (OLAP Storage)
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
[Grafana Dashboards]       [Custom BI Reports]
```

---

## 2. Event Registry Schemas

### 2.1 Clickstream Events
* **`video_watch_time`**: Tracks reel watch times.
  * Attributes: `user_id`, `reel_id`, `duration_watched_seconds`, `completed` (boolean), `timestamp`.
* **`ai_rag_query`**: Tracks RAG queries.
  * Attributes: `user_id`, `document_id`, `prompt_tokens`, `completion_tokens`, `cost_cents`.

### 2.2 Billing & Conversion Events
* **`subscription_upgraded`**: Triggers on successful upgrades.
  * Attributes: `user_id`, `previous_tier`, `new_tier`, `stripe_charge_id`.

---

## 3. Database Schema (ClickHouse OLAP)

```sql
CREATE TABLE IF NOT EXISTS telemetry_events (
  event_name LowCardinality(String),
  user_id UUID,
  session_id String,
  ip_address String,
  user_agent String,
  payload_json String,
  created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (event_name, created_at, user_id);
```

---

## 4. Key Performance Indicators (KPIs)
* **Reel Retention Rate**: Average percentage of a reel watched before a user scrolls past.
* **RAG Prompt Success Rate**: Percentage of AI responses rated as helpful (via 👍/👎 buttons).
* **Cost Per User (CPU)**: Tracks average LLM API costs incurred per user session.
