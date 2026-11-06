# ResearchReel — Complete UX Architecture Specification

This document details the UX layout grid systems, structural components, and responsive views across desktop, tablet, and mobile platforms. It catalogs why each element exists, its database/API data sources, and the user interactions it handles.

---

## 1. Global Layout Grid System
ResearchReel adopts a responsive, modular layout grid compliant with Apple Human Interface Guidelines (HIG).

### 1.1 Responsive Grid Rules
* **Desktop Layout (>= 1280px)**: 3-column layout.
  * *Left Column*: Fixed 240px sidebar for primary app navigation.
  * *Middle Column*: Flexing 680px main content scroll grid.
  * *Right Column*: Fixed 360px sidebar for widgets, recommendations, and workspace activity feeds.
* **Tablet Layout (768px - 1279px)**: 2-column layout.
  * *Left Column*: Collapsed 72px icon-only vertical navigation bar.
  * *Main Column*: Flexing content column absorbing all remaining space.
* **Mobile Layout (< 767px)**: Single column layout.
  * *Header*: Fixed 56px top bar with App Logo, Notification Bell, and Search.
  * *Content Scroll*: Full width.
  * *Footer*: Fixed 64px bottom glassmorphic bar (5-button icons).

---

## 2. Core Page UX Specifications

### 2.1 Home Feed (`/home`)
* **Purpose**: Primary dashboard for academic updates and interdisciplinary research discovery.
* **Target User**: Viewer, Student, Scholar, Faculty.
* **Component Registry**:

#### Composer Card (Rich Text Editor)
* **Why it exists**: Enables users to write posts, attach figures, upload PDFs, and link paper DOIs.
* **Data Source**: Input state buffer. On submission, calls `POST /api/v1/posts/create`.
* **Interaction**: Text input, drag-and-drop file attachment dropzone, select drop-down category menus.

#### Feed Stream (List of Post Cards)
* **Why it exists**: Displays followed and trending content dynamically.
* **Data Source**: `GET /api/v1/posts/feed`.
* **Interaction**: Infinite scroll, click Profile picture to navigate to author profile, click Paper attachment to launch Document Reader.

#### Academic Reaction Triggers (Button Group)
* **Why it exists**: Provides nuanced reactions suitable for academic peer review (🤔 Interesting, 💡 Novel, ⚠️ Needs Discussion) instead of generic "likes".
* **Data Source**: `GET /api/v1/posts/feed` reactions count. Triggers `POST /api/v1/posts/react`.
* **Interaction**: Hover shows animated tooltip, click increments count and toggle active state.

---

### 2.2 Reels Viewer (`/reels`)
* **Purpose**: Vertically scrolling immersive 9:16 short-form video player page.
* **Target User**: Viewer, Student, Scholar, General Public.
* **Component Registry**:

#### Infinite Vertical Scroll Container
* **Why it exists**: Supports rapid discovery of scientific topics using video format.
* **Data Source**: `GET /api/v1/reels` collection.
* **Interaction**: Drag/swipe up/down triggers smooth Snap-to-Page scrolling transitions.

#### Floating Details Overlay (Left)
* **Why it exists**: Displays author profiles, captions, research tags, and video timestamps.
* **Data Source**: Reels database model columns.
* **Interaction**: Tapping author profile photo routes to profile; tapping tags launches explore searches; tapping timestamps jumps the video player slider track.

#### PDF Link Button (Right Column Stack)
* **Why it exists**: Bridges video entertainment with serious scientific inquiry, directing users to the source paper.
* **Data Source**: Linked document ID metadata.
* **Interaction**: Click opens Document Reader page `/document/[id]`.

#### Ask Gemini Floating Action Button (FAB)
* **Why it exists**: On-demand AI assistant to answer questions about the video's research material without leaving the screen.
* **Data Source**: Qdrant vector database queries + Gemini LLM.
* **Interaction**: Taps slide out a RAG query dialog drawer.

---

### 2.3 Document Reader & AI Assistant (`/document/[id]`)
* **Purpose**: Split-screen interface for reading PDF research papers and interrogating their contents with AI.
* **Target User**: Student, Scholar, Faculty.
* **Component Registry**:

#### PDF Canvas Viewer (Left Pane)
* **Why it exists**: Renders academic documents at original resolution.
* **Data Source**: AWS S3 document file URL rendering on Canvas.
* **Interaction**: Pinch-to-zoom, page scroll track dragging, text selection highlighting.

#### Highlights & Annotations Panel (Right Pane Tabs)
* **Why it exists**: Lets users annotate texts and collaborate in real-time.
* **Data Source**: MongoDB `annotations` collection.
* **Interaction**: Highlighting text displays a color picker menu (Yellow, Pink, Blue) and comment text input field.

#### Ask Gemini Drawer
* **Why it exists**: Contextual Chat interface focused entirely on the open document.
* **Data Source**: FastAPI RAG endpoint `/api/v1/ai/ask-gemini`.
* **Interaction**: Text prompt input box, quick-scroll template questions (e.g. "Explain the findings of this chart"), and conversational bubbles.

---

### 2.4 Collaboration Workspace Dashboard (`/workspace/[id]`)
* **Purpose**: Shared project dashboard featuring Kanban task managers and files.
* **Target User**: Workspace members.
* **Component Registry**:

#### Kanban Board Columns (Todo, In Progress, Review, Done)
* **Why it exists**: Tracks tasks and milestones across research projects.
* **Data Source**: MongoDB `kanban_cards` matching `workspaceId`.
* **Interaction**: Drag-and-drop cards between lanes, click cards to open task editors.

#### Version History Diff Modal
* **Why it exists**: Tracks document edits side-by-side.
* **Data Source**: MongoDB `document_revisions`.
* **Interaction**: Toggles showing additions (Green highlight) and removals (Red highlights).
