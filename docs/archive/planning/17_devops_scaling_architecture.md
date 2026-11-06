# ResearchReel — DevOps & Infrastructure Scaling Specification

This document defines the cluster topologies, deployment structures, and database scaling stages to support ResearchReel from MVP launch up to 1 million registered users.

---

## 1. Multi-Stage Scale Strategy

### Phase 1: Up to 10,000 Registered Users (Single Region AWS)
* **API Gateways**: 2 instances of API Gateway running on AWS ECS Fargate.
* **Database**: AWS RDS PostgreSQL (Single `db.m5.large` instance) + Amazon ElastiCache Redis.
* **Queue**: BullMQ running inside ECS task containers.
* **Storage**: AWS S3 with Cloudflare CDN caching enabled.

### Phase 2: Up to 100,000 Registered Users (Multi-AZ Kubernetes)
* **Orchestration**: AWS EKS (Elastic Kubernetes Service) with dynamic autoscaling pods.
* **Database**: RDS PostgreSQL configured with 1 Master node and 3 Read Replicas (uses PgBouncer connection pooling).
* **Caching**: Multi-node Amazon ElastiCache Redis cluster.
* **Queue**: Apache Kafka topic partitions (12 partitions per core topic) replacing Redis-based queues.

### Phase 3: Up to 1,000,000 Registered Users (Enterprise Scale)
* **Orchestration**: EKS nodes distributed across 3 Availability Zones (AZ). GPU-equipped nodes (AWS G5) autoscale dynamically to process video workloads.
* **Database**: PostgreSQL sharding + read replicas. MongoDB clusters configured with replication sets. ClickHouse for analytics event streams.
* **Vector DB**: Qdrant collections sharded horizontally across 6 nodes.

---

## 2. Infrastructure Topology Diagram

```text
                            Client Browser / App
                                      │
                            [Cloudflare CDN + WAF]
                                      │
                         [AWS Application Load Balancer]
                                      │
                        [Nginx Ingress Controller (EKS)]
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
[API Gateways (x50)]         [Reel Services (x40)]         [AI/RAG Services (x50)]
       │                              │                              │
       └──────────────────────────────┼──────────────────────────────┘
                                      │
                           [Kafka Message Brokers (x10)]
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
 [Worker GPU (x20)]          [Search Engines (x20)]      [Notification Services (x6)]
       │                              │                              │
[Postgres Replicas]           [Qdrant Shards]               [MongoDB Replicas]
```

---

## 3. Disaster Recovery & Backup Plan
* **PostgreSQL Backup**: Daily automated snapshots with WAL archiving (allows Point-in-Time Recovery within a 14-day window).
* **S3 Backup**: Cross-region replication enabled on `rr-production-assets` bucket to safeguard uploaded papers and transcoded reels.
* **Multi-Region Failover**: AWS Route 53 routes traffic to secondary regions if primary availability zones report downtime.
