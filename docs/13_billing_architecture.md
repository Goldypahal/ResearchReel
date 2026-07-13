# ResearchReel — SaaS Billing & Usage Metering Architecture

This document specifies the billing architecture for ResearchReel V1.0 Enterprise, detailing plans, credit systems, usage tracking, and Stripe webhooks.

---

## 1. Subscription Tiers Specification

| Dimension | Free Plan | Pro Plan | Business Plan | Enterprise |
| :--- | :--- | :--- | :--- | :--- |
| **Pricing** | $0 | $29/month | $149/month | Custom quote |
| **Active Seats** | 1 user | 1 user | Up to 10 users | Unlimited seats |
| **AI Reel Credits** | 3 per month | 25 per month | 150 per month | Custom allotment |
| **Vector Storage** | 50 MB | 2 GB | 20 GB | Dedicated node |
| **Video Rendering** | Shared Queue | High Priority | Dedicated Queue | Single-Tenant GPU |

---

## 2. Credits and Usage Metering Database

```sql
-- PostgreSQL Billing and Usage Tables

CREATE TABLE IF NOT EXISTS billing_quotas (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reels_generated_this_month INT DEFAULT 0,
  reels_limit INT DEFAULT 3,
  storage_bytes_used BIGINT DEFAULT 0,
  storage_limit_bytes BIGINT DEFAULT 52428800, -- 50MB
  credits_balance INT DEFAULT 0,
  cycle_ends_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days'
);

CREATE TABLE IF NOT EXISTS billing_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL, -- 'charge', 'refund', 'credit_add'
  amount_cents INT NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  stripe_charge_id VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Stripe Webhook Integration Pipeline
The backend exposes `/api/v1/billing/webhook` to handle Stripe events:
* **`invoice.paid`**: Reads `customer_id` and metadata. Sets plan attributes (e.g. resets monthly AI credits in `billing_quotas`).
* **`customer.subscription.deleted`**: Downgrades account variables to the free tier and updates user database flags.
* **`customer.subscription.updated`**: Triggered when users upgrade/downgrade tiers. Adjusts quotas immediately.

---

## 4. UI Billing Components
* **Pricing Grid Modal**: Displayed when users hit limits. Shows plan columns, pricing, and checkout actions.
* **Usage Bar Widget**: Embedded in the profile settings panel, showing storage and AI generation progress.
