# ResearchReel — Complete Backend API Architecture Specification

This document defines the REST backend API endpoints, authentication boundaries, payload schemas, caching limits, and background job triggers for ResearchReel V1.0 Enterprise.

---

## 1. Core Endpoints Reference

### 1.1 Authentication & Registration (`/api/v1/auth`)

#### `POST /api/v1/auth/register`
* **Method**: `POST`
* **Purpose**: Enroll new user account and dispatch 6-digit OTP verification code.
* **Authentication**: None (Guest).
* **Authorization**: None.
* **Validation**:
  * `email` must be valid institutional domain.
  * `password` must have minimum length of 8, with 1 uppercase and 1 number.
* **Request Body**:
  ```json
  {
    "email": "dr.smith@harvard.edu",
    "username": "drsmith",
    "password": "SecurePassword123!",
    "role": "scholar"
  }
  ```
* **Response Body (201 Created)**:
  ```json
  {
    "success": true,
    "message": "OTP verification code sent to dr.smith@harvard.edu"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Validation failure.
  * `409 Conflict`: "Email/Username already registered".
* **Rate Limits**: 5 requests per IP / hour.
* **Background Jobs**: Triggers `send-otp-email` job in the BullMQ queue.

#### `POST /api/v1/auth/verify-otp`
* **Method**: `POST`
* **Purpose**: Submit OTP verification code to activate account.
* **Request Body**: `{ "email": "dr.smith@harvard.edu", "otp": "987654" }`
* **Response Body (200 OK)**:
  ```json
  {
    "success": true,
    "token": "jwt-token-string",
    "user": { "id": "uuid", "email": "dr.smith@harvard.edu", "role": "scholar" }
  }
  ```
* **Rate Limits**: 10 requests per IP / 15 minutes.

---

### 1.2 Collaboration & Workspace APIs (`/api/v1/projects`)

#### `POST /api/v1/projects/create`
* **Method**: `POST`
* **Purpose**: Initialize a new project workspace.
* **Authentication**: JWT Token required.
* **Authorization**: Student+ roles.
* **Request Body**:
  ```json
  {
    "name": "Quantum Superconductivity Project",
    "description": "Lab research notes and paper draft workspace",
    "collaborators": ["user1@univ.edu", "user2@univ.edu"]
  }
  ```
* **Response Body (201 Created)**:
  ```json
  {
    "success": true,
    "workspace_id": "mongodb-object-id-string"
  }
  ```
* **Background Jobs**: Triggers workspace initialization workers and sends invitations.

#### `GET /api/v1/projects/:id/tasks`
* **Method**: `GET`
* **Purpose**: Fetches Kanban cards matching target workspace.
* **Authentication**: JWT Token required.
* **Authorization**: Authorized Workspace Member.
* **Response Body (200 OK)**:
  ```json
  [
    { "id": "card-id", "title": "Check Methodology", "status": "todo" }
  ]
  ```
* **Caching**: Cached in Redis for 30 seconds, invalidated on any card status mutations.

---

### 1.3 AI and RAG Operations (`/api/v1/ai`)

#### `POST /api/v1/ai/ask-gemini`
* **Method**: `POST`
* **Purpose**: Interrogates a document using embedding matching (RAG).
* **Authentication**: JWT Token required.
* **Authorization**: Student+ roles.
* **Request Body**:
  ```json
  {
    "document_id": "document-uuid",
    "question": "What parameters did they use for the thermal scan?"
  }
  ```
* **Response Body (200 OK)**:
  ```json
  {
    "answer": "The researchers set the thermal scanner to 273 Kelvin...",
    "sources": [
      { "page": 4, "snippet": "scanning temperature: 273K" }
    ]
  }
  ```
* **Rate Limits**: 20 requests per user / hour.
* **Caching**: Redis semantic caching with similarity threshold >= 0.95.

---

### 1.4 SaaS Billing APIs (`/api/v1/billing`)

#### `POST /api/v1/billing/checkout`
* **Method**: `POST`
* **Purpose**: Generate Stripe checkout session for upgrades.
* **Authentication**: JWT Token required.
* **Request Body**: `{ "tier": "pro" }`
* **Response Body (200 OK)**: `{ "checkout_url": "https://checkout.stripe.com/..." }`
* **Rate Limits**: 10 requests per user / hour.
* **Background Jobs**: Integrates with Stripe billing webhooks (e.g. `invoice.paid`).
