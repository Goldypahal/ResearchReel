# ResearchReel — Frontend Architecture & Theme Specification

This document details the frontend architecture for ResearchReel V1.0 Enterprise, specifying Next.js folder layouts, state management, caching approaches, accessibility compliance (WCAG 2.1), and Apple HIG theme configurations.

---

## 1. Folder Structure (Next.js App Router)

```text
frontend/src/
├── app/
│   ├── layout.tsx                # Base HTML template, global CSS imports
│   ├── page.tsx                  # Landing portal route
│   ├── home/
│   │   └── page.tsx              # User dashboard feed page
│   ├── reels/
│   │   └── page.tsx              # Full-screen vertical video player
│   └── workspace/
│       └── [id]/
│           └── page.tsx          # Split PDF viewer & Kanban project board
├── components/
│   ├── ui/                       # Base accessible design elements
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Modal.tsx
│   ├── FeedCard.tsx              # Markdown post viewer with KaTeX equations
│   ├── VideoPlayer.tsx           # VideoJS HLS container
│   └── RAGChatDrawer.tsx         # Sidebar chat module for document Q&A
├── context/
│   ├── AuthContext.tsx           # Session management & user roles state
│   └── ThemeContext.tsx          # Light/Dark mode settings
├── hooks/
│   ├── useSWRMutation.ts
│   └── useWorkspace.ts           # Kanban task listeners
└── lib/
    ├── api.ts                    # Axios request client configuration
    └── validators.ts             # Zod input schemas
```

---

## 2. State Management & Data Fetching
* **Global Context**: Used for core credentials (`AuthContext`) and interface styles (`ThemeContext`).
* **Server State**: Managed via **SWR** (Stale-While-Revalidate). Ensures low local latency by caching responses, updating in the background, and resolving lists optimistically.
* **Forms & Validation**: Form management uses **React Hook Form** paired with **Zod** schema validations. This reduces unnecessary renders and validates structures before submitting to APIs.

---

## 3. Core Page Fetching & Caching Strategy

### 3.1 Home Feed (`/home`)
* **Components Used**: `ComposerCard`, `FeedCard`, `CommentDrawer`.
* **Data Fetching Strategy**: SWR infinite scroll query to `GET /api/v1/posts/feed`.
* **Caching Strategy**: SWR standard browser storage. Cache updates optimistically when posts are created locally.
* **Loading States**: Shimmering `CardSkeleton` components match card shapes.
* **Error Boundary**: Wraps the feed container, showing a recovery button: "Feed failed to load. Click to refresh".

### 3.2 Reels View (`/reels`)
* **Components Used**: `VideoPlayer`, `OverlayDetails`, `RAGChatDrawer`.
* **Data Fetching Strategy**: Pre-fetches the next 3 reels sequentially.
* **Caching Strategy**: Video chunk pre-fetching managed by service workers.
* **Loading States**: Skeletons mimic profile layouts and reaction buttons.
* **Error Boundary**: Reloads next video asset on failure.

---

## 4. HIG Theme System (Vanilla CSS / globals.css)
* **Fonts**: Default font stack is `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. Monospace uses `SFMono-Regular, Menlo, Monaco, Consolas`.
* **Borders & Shadows**: Apple-inspired border radius configurations:
  * Cards/Modals: `12px`
  * Buttons/Inputs: `8px`
  * Badges: `4px`
* **Accessibility**: Implements keyboard focus rings, `aria-live` containers for toast notifications, and sufficient color contrast (4.5:1 ratio).
