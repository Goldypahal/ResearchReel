# 🚀 ResearchReel — Quick Start & Run Guide

ResearchReel is a microservices-based, cloud-native platform designed for sharing research via short-form videos (Reels) and interactive research documents. 

This repository consists of:
*   **Next.js Frontend Web App** (`/frontend`) - Runs on port `3000`
*   **Express API Gateway / Backend** (`/backend`) - Runs on port `5000`
*   **Python RAG Microservice** (`/backend/research_rag`) - Runs on port `8000`
*   **Background Video Task Worker** (`video-worker`) - Compiles TTS and builds videos
*   **Postgres & Redis** - Database and caching backends

---

## 🛠️ Prerequisites

Before running the application, make sure you configure your environment variables:

1.  **Configure API Keys**:
    *   Create a `.env` file in the workspace root by copying `.env.example`.
    *   Set your `GEMINI_API_KEY` (powers AI chat & video generation) in the `.env` file or in `backend/.env`.
    *   Provide any other credentials (like `QDRANT_API_KEY` and `QDRANT_URL`) if utilizing remote vector indices.
2.  **Verify local files**:
    *   Ensure a `.env` exists in `/backend` (copied from `backend/.env.example`).
    *   Ensure a `.env` exists in `/frontend` (copied from `frontend/.env.local`).

---

## 🐳 Option A: Running with Docker Compose (Recommended)

Docker Compose spins up the entire stack (PostgreSQL, Redis, Python RAG Service, Node Gateway, Next.js Frontend, and background workers) automatically.

### 1. Start all services
Run the following command in the root workspace directory:
```bash
docker-compose up --build -d
```
This builds and launches the containers in detached (background) mode.

### 2. Seed the Database
To populate the database with default test users (including `albert@princeton.edu`), sample papers, and reels, run the seed script inside the API Gateway container:
```bash
docker-compose exec api-gateway npm run seed
```

### 3. Access the Application
*   **Frontend Web App**: [http://localhost:3000](http://localhost:3000)
*   **API Gateway / Backend**: [http://localhost:5000](http://localhost:5000)
*   **RAG Microservice**: [http://localhost:8000](http://localhost:8000)

### 4. Stop the services
To stop and remove all containers:
```bash
docker-compose down
```

---

## 💻 Option B: Running Locally (Individual Services)

If you prefer to run services manually outside Docker, follow this sequence:

### 1. Backing Services Setup
Ensure you have local instances of:
*   **PostgreSQL** running on port `5432` (or the port defined in `backend/.env`) with a database named `researchreel`.
*   **Redis** running on port `6379`.

### 2. Run Database Migrations & Seeding
From the `/backend` folder:
```bash
cd backend
npm install
# Run migrations to update table structures
npx node-pg-migrate up
# Seed the database
npm run seed
```

### 3. Start Backend & API Gateway
From the `/backend` folder:
```bash
npm run dev
```
The gateway will start on port `5000`.

### 4. Start Python RAG Service
From the `/backend/research_rag` folder:
```bash
cd backend/research_rag
# Set up virtual environment (Windows)
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
# Run the FastAPI server
python -m app.main
```
The RAG service will listen on port `8000`.

### 5. Start Next.js Frontend
From the `/frontend` folder:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🔑 Default Test Credentials
Use the following credentials to sign in and test features (once seeded):
*   **Email / Username**: `albert@princeton.edu`
*   **Password**: `Science123!`
*   *Note*: The developer setup bypasses SMTP requirements and directly verifies your session.
