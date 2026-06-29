# ResearchReel Production Deployment Checklist & Credentials Guide

This guide contains the final step-by-step task list and API credentials you need to configure to deploy the ResearchReel platform live.

---

## 1. Required API Keys & Secrets

Before deploying, ensure you have gathered the following credentials. You must add these to your environment configuration files or inject them as secrets.

| Secret Name | Purpose | Recommended Production Value Source |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Powers paper summaries and AI chat responses | [Google AI Studio Console](https://aistudio.google.com/) |
| `QDRANT_URL` | Microservice vector database URL | Qdrant Cloud Cluster Endpoint |
| `QDRANT_API_KEY` | Vector database write/read authentication | Qdrant Cloud API Credentials |
| `JWT_SECRET` | Signs authentication tokens | Strong random 256-bit key (e.g., `openssl rand -hex 32`) |
| `DATABASE_URL` | Connection string to PostgreSQL | `postgresql://<user>:<password>@postgres:5432/researchreel` |
| `REDIS_URL` | Cache and BullMQ broker URL | `redis://redis:6379` |
| `AWS_ACCESS_KEY_ID` | Access key for S3 media storage | AWS IAM Console (S3 read/write permissions) |
| `AWS_SECRET_ACCESS_KEY` | Secret key for S3 media storage | AWS IAM Console |
| `AWS_S3_BUCKET` | AWS S3 Bucket Name for media files | Name of the bucket you created |
| `KUBE_CONFIG` | Kubernetes configuration credentials | Extracted from AWS EKS (`aws eks update-kubeconfig`) |

---

## 2. Step-by-Step Deployment Task List

Follow these steps sequentially to take the platform online.

### Phase 1: Infrastructure Provisioning (IaC)
- [ ] **Install AWS CLI & Terraform**: Ensure Terraform and AWS CLI are installed on your terminal.
- [ ] **Configure AWS CLI**: Run `aws configure` and input your AWS access keys.
- [ ] **Initialize Terraform**: Run `terraform init` inside the `terraform/` directory.
- [ ] **Provision Cluster**: Run `terraform apply` to deploy the VPC, subnet rules, and EKS Cluster. (Take note of the output `eks_cluster_name`).

### Phase 2: Configuration & Secret Setup
- [ ] **Extract Kubeconfig**:
  ```bash
  aws eks update-kubeconfig --region us-east-1 --name researchreel-cluster
  ```
- [ ] **Create Kubernetes Secrets**: Set up database and API credentials inside the EKS cluster namespace:
  ```bash
  kubectl create secret generic api-secrets \
    --from-literal=gemini-key="YOUR_GEMINI_KEY" \
    --from-literal=qdrant-key="YOUR_QDRANT_KEY" \
    --from-literal=jwt-secret="YOUR_JWT_SECRET" \
    --from-literal=aws-access-key="YOUR_AWS_ACCESS_KEY" \
    --from-literal=aws-secret-key="YOUR_AWS_SECRET_KEY"
  ```
- [ ] **Set GitHub Secrets**: Add `KUBE_CONFIG` (the content of your `~/.kube/config` file) as a repository secret in GitHub.

### Phase 3: CI/CD Deployment
- [ ] **Push to Main**: Merge code changes into your repository's `main` branch. This triggers the GitHub Actions workflow (`deploy.yml`).
- [ ] **Monitor Workflow**: Check the GitHub Actions tab to ensure that tests pass, Docker containers build, push to GHCR, and deployment rollouts succeed.
- [ ] **Verify Pods Status**:
  ```bash
  kubectl get pods -A
  ```

### Phase 4: Networking & Routing
- [ ] **Retrieve Ingress URL**: Get the external DNS address of the LoadBalancer created by the Nginx Ingress:
  ```bash
  kubectl get ingress researchreel-ingress
  ```
- [ ] **Map DNS**: Point your domain (e.g., `researchreel.com`) to the LoadBalancer address via your registrar.
- [ ] **Configure TLS (HTTPS)**: Install `cert-manager` on your EKS cluster to automatically issue SSL certificates from Let's Encrypt.

### Phase 5: Production-Readiness & Validation Testing
- [ ] **Verify Performance Metrics**: Ensure API response latency conforms to production guidelines (Login < 150ms, Upload < 500ms, Feed < 100ms, Search < 100ms). See detailed logs in [docs/production_readiness_verification.md](file:///g:/Desktop/RESEARCHAPP/docs/production_readiness_verification.md).
- [ ] **Run Load Tests**: Conduct load simulation with k6 or Locust to confirm stability at 100 concurrent users (0% failure rate) and 1,000 req/min (99.98% success rate).
- [ ] **Validate Security Auditing**: Verify HTTPS configurations, JWT expiration limits, Argon2 hash iterations, SQL injection protection, CORS headers, Helmet policies, and rate-limiting rules.
- [ ] **Verify Logging Integrity**: Ensure Winston application logs format as JSON in production and Morgan HTTP access logs capture all incoming API paths.
- [ ] **Run System Monitoring Probe**: Trigger the `/api/health` aggregator and confirm healthy states (UP) for Postgres, Redis, RAG service, and Elasticsearch.
- [ ] **Verify Recovery & Failover**: Test database replica promotions and confirm BullMQ queue tasks automatically recover when worker containers fail.

