# ResearchReel — Complete Production-Grade Sitemap Specification

This document details the complete sitemap tree and navigation structure for ResearchReel V1.0 Enterprise. It maps every page, modal, drawer, route, breadcrumb path, and authorization rule.

---

## Sitemap Tree Architecture

```text
Root Page (/) [Marketing Page]
├── /auth [Auth Shell]
│   ├── /auth/login [Login Screen]
│   ├── /auth/register [Registration Wizard]
│   ├── /auth/verify [OTP Verification]
│   └── /auth/forget-password [Password Recovery]
└── /home [Dashboard Shell] - (Required: Viewer+)
    ├── /home [Feed Dashboard]
    ├── /explore [Explore Hub]
    │   ├── /explore/conference/[id] [Conference Tracker]
    │   └── /search [Semantic Search Portal]
    ├── /reels [Reels Viewer]
    ├── /create [Creator Workspace]
    │   ├── /create/upload [Paper Upload Portal]
    │   ├── /editor/[draft_id] [Reel Video Editor]
    │   └── /reels/automation [Automation Settings]
    ├── /projects [Team Collaboration List]
    │   └── /workspace/[id] [Workspace Project Board]
    │       ├── /document/[doc_id] [Document PDF Reader]
    │       └── /workspace/[id]/diff [Version Control Interface]
    ├── /messages [Chat Hub]
    │   └── /messages/[conv_id] [Direct/Group Chat Thread]
    ├── /leaderboard [Academic Leaderboard]
    ├── /achievements [Gamified Badges Center]
    ├── /profile/[user_id] [Researcher Profile Page]
    │   ├── /profile/settings [Settings Dashboard]
    │   ├── /profile/settings/billing [Subscription & Metering]
    │   └── /profile/settings/api [API Key Management]
    ├── /support [Support Center]
    └── /mod [Admin Portal] - (Required: Moderator+)
        ├── /mod/reports [Moderation Queue]
        ├── /mod/users [User Verification Dashboard]
        ├── /mod/health [System Health metrics]
        └── /mod/flags [Feature Flags Panel]
```

---

## Page-by-Page Sitemap Details

### 1. Marketing Portal (`/`)
* **Purpose**: Explains platform benefits, features, and pricing tiers to convert visitors.
* **Parent Page**: None (Root)
* **Child Pages**: `/auth/login`, `/auth/register`
* **Permissions**: Guest / Anonymous
* **Navigation Path**: Direct landing.
* **Breadcrumbs**: `Home`

### 2. Login Screen (`/auth/login`)
* **Purpose**: Authenticate returning users via credentials or OAuth callbacks.
* **Parent Page**: `/`
* **Child Pages**: `/auth/register`, `/auth/forget-password`
* **Permissions**: Guest
* **Navigation Path**: Header click -> Login.
* **Breadcrumbs**: `Home > Auth > Login`

### 3. Registration Wizard (`/auth/register`)
* **Purpose**: User enrollment step-by-step (profile details, academic interests).
* **Parent Page**: `/auth/login`
* **Child Pages**: `/auth/verify`
* **Permissions**: Guest
* **Navigation Path**: Login page -> "Sign Up" button.
* **Breadcrumbs**: `Home > Auth > Register`

### 4. OTP Verification Page (`/auth/verify`)
* **Purpose**: Verifies email validity via a 6-digit OTP code before activating session.
* **Parent Page**: `/auth/register`
* **Child Pages**: None
* **Permissions**: Unverified User
* **Navigation Path**: Redirected post-registration.
* **Breadcrumbs**: `Home > Auth > Verify`

### 5. Home Feed (`/home`)
* **Purpose**: Centralized scrollable feed of text posts, paper uploads, and shared reels.
* **Parent Page**: None (Shell Root)
* **Child Pages**: Post Modals, Comment Drawers
* **Permissions**: Viewer+ (Authenticated)
* **Navigation Path**: Sidebar link -> Feed.
* **Breadcrumbs**: `Dashboard > Feed`

### 6. Reels Feed Viewer (`/reels`)
* **Purpose**: Full-screen 9:16 vertical video player containing academic reels.
* **Parent Page**: `/home`
* **Child Pages**: RAG Chat Drawer, Paper Link Pages
* **Permissions**: Viewer+
* **Navigation Path**: Sidebar link -> Reels.
* **Breadcrumbs**: `Dashboard > Reels`

### 7. Creator Dashboard (`/create`)
* **Purpose**: Starting point to upload scientific materials or launch text-to-reel drafts.
* **Parent Page**: `/home`
* **Child Pages**: `/create/upload`, `/editor/[id]`
* **Permissions**: Student+
* **Navigation Path**: Sidebar -> Creator Studio.
* **Breadcrumbs**: `Dashboard > Creator Studio`

### 8. Reel Video Editor (`/editor/[draft_id]`)
* **Purpose**: Interactive canvas editor to arrange voice narration, slide transitions, and subtitle rendering.
* **Parent Page**: `/create`
* **Child Pages**: `/reels/automation`
* **Permissions**: Student+
* **Navigation Path**: `/create` -> "Edit Draft" button.
* **Breadcrumbs**: `Dashboard > Creator Studio > Video Editor`

### 9. Document PDF Reader (`/document/[doc_id]`)
* **Purpose**: Reading interface containing highlight controls, annotation panels, and the Ask Gemini chat drawer.
* **Parent Page**: `/workspace/[id]`
* **Child Pages**: None
* **Permissions**: Student+
* **Navigation Path**: Workspace project page -> Click attached paper.
* **Breadcrumbs**: `Dashboard > Workspace > Document [ID]`

### 10. Workspace Project Board (`/workspace/[id]`)
* **Purpose**: Shared project environment featuring Kanban boards, task lists, and shared research documents.
* **Parent Page**: `/projects`
* **Child Pages**: `/document/[doc_id]`, `/workspace/[id]/diff`
* **Permissions**: Member (Workspace specific)
* **Navigation Path**: Projects list page -> Select workspace.
* **Breadcrumbs**: `Dashboard > Workspaces > Workspace [ID]`

### 11. Document Version Diff Panel (`/workspace/[id]/diff`)
* **Purpose**: Compares document iterations side-by-side (LaTeX code comparisons).
* **Parent Page**: `/workspace/[id]`
* **Child Pages**: None
* **Permissions**: Editor+ (Workspace specific)
* **Navigation Path**: Workspace page -> click "Compare Versions".
* **Breadcrumbs**: `Dashboard > Workspace > Compare Diff`

### 12. Support & Help Center (`/support`)
* **Purpose**: FAQ list, contact links, and ticket submission forms.
* **Parent Page**: `/home`
* **Child Pages**: None
* **Permissions**: Viewer+
* **Navigation Path**: Sidebar footer -> Support.
* **Breadcrumbs**: `Dashboard > Support`

### 13. API Key Management (`/profile/settings/api`)
* **Purpose**: Generate/revoke API access tokens for RAG queries and paper imports.
* **Parent Page**: `/profile/settings`
* **Child Pages**: None
* **Permissions**: Pro+
* **Navigation Path**: Profile Settings -> API Credentials.
* **Breadcrumbs**: `Dashboard > Profile > Settings > API Keys`

### 14. Billing Dashboard (`/profile/settings/billing`)
* **Purpose**: Upgrade subscription plans, check credit balance, and download invoices.
* **Parent Page**: `/profile/settings`
* **Child Pages**: None
* **Permissions**: Viewer+
* **Navigation Path**: Profile Settings -> Billing.
* **Breadcrumbs**: `Dashboard > Profile > Settings > Billing`

### 15. Admin Moderation Portal (`/mod`)
* **Purpose**: Review moderation reports, manage user verification states, and monitor system health metrics.
* **Parent Page**: `/home`
* **Child Pages**: `/mod/reports`, `/mod/users`, `/mod/health`, `/mod/flags`
* **Permissions**: Moderator+
* **Navigation Path**: Sidebar link -> Admin Portal.
* **Breadcrumbs**: `Admin Portal > Dashboard`
