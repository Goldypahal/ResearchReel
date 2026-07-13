# UI Features Overview: ResearchReel

ResearchReel is a premium academic collaboration platform with a "research-first" design philosophy. The UI combines Instagram-style navigation with high-performance research tools.

## 1. Primary Navigation & Layout
- **Glassmorphic Navigation Bar**: Fixed bottom bar with 5 primary tabs (Home, Reels, Add, Messages, Profile).
- **Research-First Top Bar**: App logo (quick scroll to top), notification center with badge alerts, and a global "Add Post" button (+ icon).
- **Responsive Web & Mobile**: Built with Next.js (web) and Flutter (mobile) for a seamless cross-platform experience.

## 2. Home Feed (The "Research Feed")
- **Multi-Content Feeds**: Supports interleaved content types including research updates, lab photos, document previews, and GitHub code snippets.
- **Academic Reactions**: Dedicated reaction buttons beyond 1-bit "likes":
  - 🤔 **Interesting** (Blue)
  - 💡 **Novel** (Yellow)
  - ⚠️ **Needs Discussion** (Orange)
- **Inline Latex Rendering**: Math formulas and equations render beautifully across posts and comments using KaTeX/Markdown support.
- **Embedded Document Previews**: PDF and DOCX files show a visual preview snippet directly in the feed.

## 3. Reels Interface & AI Content Studio
- **Full-Screen 9:16 Vertical Player**: Immersive full-screen video player optimized for mobile.
- **Swipe-to-Discover**: Infinite scroll logic for discovery of new research fields.
- **Interactive Timestamps**: Tappable time-markers that jump to specific figures or equation explanations in the video.
- **Researcher Overlay**: Floating researcher profile, verification status, field tags, and a direct link to the full research paper.
- **AI Content Studio & Auto-Generator**: A creator panel that parses uploaded papers and compiles them into customizable video slides, scripts, voiceovers, blog posts, and slide decks. Includes automation controls, customizable target difficulty levels, multi-accent voices, and fact-checking safeguards.

## 4. Messaging & Collaboration Tabs
- **Real-time Messaging Hub**: 1-on-1 and Group chats with real-time typing indicators and read receipts.
- **Secure File Sharing**: Drag-and-drop file sharing for datasets, papers, and code snippets within the chat.
- **Project Kanban Boards**: Advanced collaboration boards for research projects with task assignment, status columns, and activity timelines.
- **Version Control UI**: Side-by-side "Diff" view for comparing doc versions and branching/merging features for experimental edits.

## 5. In-App Document Reader & Annotation
- **Professional PDF Engine**: Native-speed document viewer with multi-tab support and page-level bookmarks.
- **Dynamic Annotation Tools**: Color-coded highlighting, sticky notes for collaborators, and freehand drawing for diagram analysis.
- **Ask Claude FAB**: A floating action button (FAB) that opens an AI assistant (Claude 3.5 Sonnet) specifically trained on the current document for on-demand summaries or Q&A.

## 6. Explore & Search
- **Universal Semantic Search**: AI-powered search that understands research concepts, not just keywords.
- **Quality-Weighted Algorithm**: Discovery feed categorized by "Rising Researchers", "Discipline Tags", and "Conference Tracks" (e.g., NeurIPS, CVPR).
- **Conference Tracking**: Dedicated UI sections to follow live updates from specific academic events.

## 7. Profile & Recognition
- **Researcher Credential Tiers**: Visual badges for verification status:
  - 🏆 **Gold Badge** (ORCID Verified Scholar)
  - 🎓 **Blue Badge** (Verified Student)
  - 🏢 **Green Badge** (Verified Faculty)
- **Academic Stats**: Citation counters, publication grids, and research interest tags.
- **Researcher Bio**: Short-form professional bio with linked external profiles (Google Scholar, GitHub, LinkedIn).

## 8. Moderation & Integrity UI
- **Moderator Dashboard**: Queue-based review interface for community reports with prioritized ranking.
- **Academic Integrity Labels**: Clear visual banners (e.g., "Not Peer-Reviewed" for preprints).
- **Plagiarism Detection UI**: Highlights text areas flagged by automated checks.
