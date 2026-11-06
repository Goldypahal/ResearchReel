# ResearchReel — DevOps & Deployment Guide

This guide describes the containerization, orchestration, automation pipelines, and infrastructure management strategies configured for the **ResearchReel** platform.

---

## 1. Containerization (Docker)

Each microservice is encapsulated within an isolated Docker environment. This guarantees consistency across development, staging, and production environments.

### 1.1 Dockerfile Structure
The node backend (`backend/Dockerfile`) uses a multi-stage build design to keep production images lightweight:

```dockerfile
# Stage 1: Build & Dependencies
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Stage 2: Production Runtime
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
EXPOSE 5000
CMD ["node", "src/server.js"]
```

### 1.2 Local Orchestration (Docker Compose)
* **`docker-compose.yml`**: Provisions the core API Gateway, Postgres, Redis, and Elasticsearch containers for standard integration testing.
* **`docker-compose.microservices.yml`**: Provisions the entire decoupled service stack, simulating the production environment locally by spinning up:
  - Auth, Profile, Paper, Reel, and Video workers.
  - Python RAG FastAPI service.
  - ClickHouse, Neo4j, Cassandra, and Qdrant.

---

## 2. Orchestration & Kubernetes (k8s)

The platform is designed to run in a clustered Kubernetes environment (e.g., AWS EKS). Manifests are located in the `k8s/` directory.

### 2.1 Pod Deployments & Services
Each service runs inside dedicated deployments with strict replica limits and environment secrets mapping:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: researchreel-gateway-deployment
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
        - name: gateway
          image: ghcr.io/username/api-gateway:latest
          ports:
            - containerPort: 5000
          env:
            - name: PORT
              value: "5000"
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: researchreel-secrets
                  key: jwt-secret
```

### 2.2 Ingress Routing (`ingress.yml`)
An Nginx Ingress Controller handles SSL/TLS termination and routes traffic based on HTTP request path prefixes:
* `/api/auth` → `auth-service`
* `/api/posts` → `reel-service`
* `/api/search` → `search-service`
* `/` → `frontend` Next.js server

### 2.3 Persistent Volume Claims (PVC)
To support shared video storage between the API Gateway and the transcode workers, the manifests provision a shared `ReadWriteMany` network file volume (`media-uploads-pvc`).

---

## 3. CI/CD Pipeline (GitHub Actions)

The repository automated lifecycle is configured inside `.github/workflows/deploy.yml` and triggers on pushes to the `main` branch.

```text
               [Developer Push / Merge to Main]
                              │
                    [Audit & Lint Checks]
                              │
                    [Run Backend Unit Tests]
                              │
                  [Build Multi-Stage Images]
                              │
                   [Publish Images to GHCR]
                              │
                 [Apply Kubernetes Manifests]
                              │
                   [Rolling Update Rollout]
```

### Pipeline Details
1. **Audit & Testing Job (`audit-and-test`)**:
   * Installs NPM packages.
   * Audits dependency vulnerabilities (`npm audit --audit-level=high`).
   * Runs the backend test suites (`npm test`).
   * Verifies the Next.js frontend builds without errors.
2. **Build & Push Job (`build-and-push`)**:
   * Uses Docker Buildx to build separate container images for the `api-gateway`, `video-worker`, `rag-service`, and Next.js `frontend`.
   * Tags images using the Git commit SHA and the `latest` label.
   * Publishes images to the GitHub Container Registry (GHCR).
3. **Deployment Job (`deploy-to-kubernetes`)**:
   * Connects to EKS using the `KUBE_CONFIG` secret.
   * Re-applies Kubernetes manifests to update environment configurations.
   * Executes `kubectl set image` to trigger rolling updates to the active pods using the newly built Docker tag hashes.

---

## 4. Backups & Data Preservation (Planned Architecture)

To protect against critical infrastructure failures, the system architecture is designed for daily automated backups.

* **PostgreSQL Backup CronJob**: A containerized task is designed to run `pg_dump` every night, compress the SQL output, and ship it to an encrypted AWS S3 bucket (to be implemented).
* **Storage Replication**: The S3 media bucket is planned to use cross-region replication (CRR) to ensure data redundancy across multiple AWS regions.

---

## 5. Autoscaling Architecture (Architectural Blueprint)

The system is designed to support Kubernetes Horizontal Pod Autoscaling (HPA) for high-traffic nodes (e.g., API Gateway, AI Service). The planned configuration outlines:
* **Metric Trigger**: If average CPU utilization exceeds **70%** or RAM exceeds **80%**, the replica set automatically provisions additional pods.
* **Target Scale boundaries**: Scaling limits are configured to support horizontal scaling from **2 to 10 replicas** under current resource constraints, designed to prevent cascading failures during usage spikes.
