ResearchReel — Production Frontend Specification
0. Product Definition
App Name

ResearchReel

Target Platform

Responsive Web Application

Recommended implementation:

Next.js + TypeScript
Tailwind CSS
Component-based design system
React Query/TanStack Query for server state
Zustand or Context for lightweight global UI state
WebSocket/SSE for messaging and long-running AI jobs
Responsive desktop-first workspace with tablet/mobile adaptations
Primary Users
Students
Researchers
Professors/academics
Research teams
Research-content creators
Core Value Proposition

ResearchReel helps researchers discover, understand, organize, collaborate on, and transform academic research into interactive and shareable content.

The product should feel like a combination of:

Research discovery + AI copilot + collaborative workspace + academic social network + research content creator.

1. Product Information Architecture
Primary Navigation

Desktop sidebar:

ResearchReel
│
├── 🏠 Home
├── 🔎 Discover
├── 📚 Library
├── 🤖 AI Research
├── 👥 Projects
├── 🎬 Reels
├── 💬 Messages
│
├── ─────────────
│
├── 🔔 Notifications
├── 👤 Profile
└── ⚙ Settings

Mobile:

┌──────────────────────────────┐
│ ResearchReel       🔔  👤    │
├──────────────────────────────┤
│                              │
│       Current Screen         │
│                              │
├──────────────────────────────┤
│ Home │ Discover │ + │ Reels │
│                 │   │       │
└──────────────────────────────┘

The + button opens a creation sheet.

2. Global Navigation Architecture
Desktop

Use a persistent left sidebar + top utility bar.

┌───────────────┬───────────────────────────────────────────┐
│               │ Search ResearchReel          🔔  Avatar   │
│ ResearchReel  ├───────────────────────────────────────────┤
│               │                                           │
│ 🏠 Home       │                                           │
│ 🔎 Discover   │                                           │
│ 📚 Library    │              PAGE CONTENT                 │
│ 🤖 AI         │                                           │
│ 👥 Projects   │                                           │
│ 🎬 Reels      │                                           │
│ 💬 Messages   │                                           │
│               │                                           │
│               │                                           │
│ ⚙ Settings   │                                           │
└───────────────┴───────────────────────────────────────────┘
Mobile

Persistent bottom navigation:

Home | Discover | Create | Reels | Profile

Secondary functionality is accessible through Profile/Menu.

3. Route Architecture
/
├── /landing
│
├── /auth
│   ├── /login
│   ├── /register
│   ├── /verify-email
│   └── /forgot-password
│
└── /app
    ├── /home
    ├── /discover
    ├── /search
    │
    ├── /library
    │   ├── /documents/:id
    │   └── /documents/:id/versions
    │
    ├── /ai
    │   ├── /ask
    │   ├── /summarize
    │   └── /recommendations
    │
    ├── /projects
    │   ├── /new
    │   └── /:projectId
    │       ├── /overview
    │       ├── /documents
    │       ├── /tasks
    │       └── /members
    │
    ├── /reels
    │   ├── /create
    │   ├── /drafts
    │   └── /:id
    │
    ├── /messages
    │   └── /:conversationId
    │
    ├── /notifications
    │
    ├── /profile
    │   └── /:username
    │
    └── /settings
        ├── /account
        ├── /security
        ├── /notifications
        ├── /appearance
        └── /integrations
4. Authentication Screens
Screen: Landing Page
Purpose

Introduce ResearchReel and convert visitors into registered users.

Route

/

Layout

Header

ResearchReel logo
Discover
Features
For Researchers
Login
Get Started

Hero

Turn Research Into Knowledge.

Discover papers.
Understand them with AI.
Collaborate with researchers.
Create engaging research content.

[Start Researching] [Explore Research]

Feature sections

AI Research Assistant
Research Discovery
Collaborative Projects
Research Reels
Citation Intelligence

Footer

About
Privacy
Terms
Contact
GitHub
Interactions

Start Researching → /auth/register

Login → /auth/login

Screen: Login
Route

/auth/login

Layout

Centered authentication card.

Welcome back

Email
[________________]

Password
[________________] 👁

[ Forgot password? ]

[ Login ]

──────── OR ────────

[ Continue with ORCID ]

Don't have an account?
Create account
Validation
Email required
Valid email format
Password required
States

Loading:

Signing you in...

Error:

Incorrect email or password.
Success

→ /app/home

Screen: Register
Route

/auth/register

Fields
Full name
Username
Email
Password
Confirm password
Institution
Research interests
CTA

Create ResearchReel Account

Validation

Password:

Minimum 8 characters
Strength indicator

Username:

Minimum 3 characters
Availability check
Success

→ /auth/verify-email

Screen: Verify Email
Route

/auth/verify-email

Layout
Verify your email

We've sent a 6-digit verification code
to your email.

[ _ _ _ _ _ _ ]

Didn't receive it?

[Resend Code]

[Verify]
States
Invalid OTP
Expired OTP
Too many attempts
Resend cooldown
Success

→ /app/home

5. Main Application
Screen: Home Dashboard
Route

/app/home

Purpose

Give researchers a personalized overview of their research activity.

Header
Good morning, Rajvir

[Search research...]       🔔 Avatar
Body
Hero AI Card
Research Copilot

What are you researching today?

[ Ask ResearchReel AI... ]

→ /app/ai/ask

Quick Actions
[Upload Paper]
[Ask AI]
[Create Reel]
[New Project]
Continue Researching

Horizontal cards:

Recent Paper
Title
Authors
Last opened
Progress
Recommended Papers

AI-powered recommendations.

Active Projects

Project cards showing:

Project name
Members
Progress
Last activity
Recent Reels

Research content generated by user/community.

Loading

Use skeleton cards rather than spinner.

Empty State
Your research workspace is empty.

Start by adding your first paper.

[Upload Paper]
Screen: Discover
Route

/app/discover

Purpose

Discover academic papers, researchers and research content.

Header
Discover Research

[ Search papers, topics, authors... ]
Filter bar
Topics
Publication Year
Authors
Institution
Citation Count
Open Access
Tabs
Papers | Researchers | Reels | Projects
Paper Card
Paper Title

Author 1 · Author 2
University

Abstract preview...

Citations: 245
2025

[Save] [Ask AI] [Open]
Interactions

Paper → Document Reader

Save → Library

Ask AI → AI Research

Screen: Search
Route

/app/search?q=...

Purpose

Global research search.

Layout

Search input at top.

Results grouped by:

Papers
Authors
Projects
Users
Reels
Filters

Left desktop sidebar.

Mobile → filter bottom sheet.

Empty
No research found.

Try:
• broader keywords
• different author
• removing filters
6. Research Library
Screen: Library
Route

/app/library

Purpose

Manage saved/uploaded research documents.

Header
My Library                         [Upload]
Tabs
All | Recent | Favorites | Shared
Document Card
📄 Transformer Architecture...

Authors
Added 2 days ago

AI Summary Available

[Open] [⋮]
Context Menu
Open
Rename
Add to Project
Generate Reel
Ask AI
View Versions
Delete
Screen: Document Reader
Route

/app/library/documents/:id

This should be one of the most important screens in the product.

Layout
┌──────────────────────────────────────────────────────────────┐
│ ← Back    Paper Title                 ⭐ Share ⋮             │
├───────────────┬──────────────────────────────┬───────────────┤
│ Contents      │                              │ AI Assistant  │
│               │       PDF / Document         │               │
│ Abstract      │                              │ Ask anything  │
│ Introduction  │                              │ about paper   │
│ Methodology   │                              │               │
│ Results       │                              │ [Question...] │
│ References    │                              │               │
└───────────────┴──────────────────────────────┴───────────────┘
Left Panel
Document outline
Page navigation
Search within document
Center

PDF/document viewer.

Right Panel

AI Research Copilot.

Summarize
Explain Method
Find Limitations
Explain Figure
Compare With Other Papers
Primary Actions

Ask AI

Summarize

Generate Reel

Add to Project

Cite

Mobile

Use tabs:

Document | AI
Screen: Document Versions
Route

/app/library/documents/:id/versions

Purpose

Show document history.

Version Card
Version 4

Edited by Rajvir
September 5, 2026

"Updated methodology"

[View]
Actions
View version
Compare
Restore
7. AI Research
Screen: AI Research Hub
Route

/app/ai

Hero
Research Copilot

Your AI assistant for academic research.

[Ask a Research Question]
Feature cards
🤖 Ask AI
Summarize and reason about papers

📄 Summarize
Generate structured summaries

🔎 Research Gaps
Identify limitations and opportunities

🎓 Recommendations
Find related research

📊 Compare Papers
Compare multiple papers
Screen: AI Ask
Route

/app/ai/ask

Layout

Chat interface.

Research Copilot

You:
What are the limitations of this methodology?

AI:
Based on the paper...

Sources:
[Paper PDF, p.7]
[Paper PDF, p.12]

────────────────────

[Ask a research question...]     ➤
AI Response Components

Every factual answer should show citations.

Answer
────────────

...

Sources
[Paper • Page 7]
[Paper • Page 12]
Actions
Copy
Regenerate
Save
Cite
Ask follow-up
Important UX

Never show an AI answer without clear loading state.

Use:

Analyzing paper...
Finding relevant passages...
Generating answer...
Screen: AI Summary
Route

/app/ai/summarize

Layout
Select Paper

[ Transformer Architecture.pdf ]

Summary Style

○ Quick
○ Standard
○ Detailed

[Generate Summary]

Result:

Executive Summary

Key Findings

Methodology

Limitations

Research Gap

Potential Applications

Actions:

Save

Export

Generate Reel

Screen: AI Recommendations
Route

/app/ai/recommendations

Sections
Recommended For You

Because you read:
"Attention Is All You Need"

You may also like:

Paper cards...
Recommendation explanation

Always show:

Recommended because you follow NLP and recently saved transformer papers.

This improves trust.

8. Projects / Collaboration
Screen: Projects Dashboard
Route

/app/projects

Header
Research Projects                 [+ New Project]
Project cards
AI Text Detection Research

4 members
12 papers
8 tasks

Progress ███████░░░ 72%

[Open]
Screen: Create Project
Route

/app/projects/new

Form
Project name
Description
Research field
Visibility
Invite members
CTA

Create Project

Success

→ Project Overview

Screen: Project Overview
Route

/app/projects/:projectId/overview

Header
← Projects

AI Text Detection Research

[Invite] [Settings]
Tabs
Overview
Documents
Tasks
Members
Activity
Dashboard
Project Progress

Documents: 12
Tasks: 8
Members: 4
Recent Activity
Screen: Project Documents
Route

/app/projects/:projectId/documents

Actions
Add existing paper
Upload paper
Remove document
Open document
Screen: Project Tasks
Route

/app/projects/:projectId/tasks

Use Kanban.

TODO             IN PROGRESS        DONE

Research         Literature        Dataset
Review           Review             Analysis

Experiment       Model Training     Paper Draft
Task modal

Fields:

Task title
Description
Assignee
Due date
Status
Priority
Screen: Project Members
Route

/app/projects/:projectId/members

Member card
Avatar
Name
Role

Owner
Researcher
Contributor

Actions:

Invite
Remove
Change role
9. Research Reels

This is one of ResearchReel's strongest differentiators.

Screen: Reels Feed
Route

/app/reels

Purpose

TikTok/Instagram-style research content discovery.

Layout

Vertical content cards.

┌──────────────────────────────┐
│                              │
│       Research Reel          │
│                              │
│       Video                  │
│                              │
│                              │
│  @researcher                 │
│  Why Transformers Matter     │
│                              │
│  ❤️ 234                      │
│  💬 42                       │
│  🔖 Save                     │
│                              │
└──────────────────────────────┘
Actions
Like
Comment
Save
Share
Follow researcher
Open source paper
Screen: Create Reel
Route

/app/reels/create

Step 1

Select paper.

Choose Research Paper

[Search library...]

[Continue]
Step 2

AI generates draft.

Generating your research reel...

✓ Paper analyzed
✓ Key findings extracted
✓ Script generated
○ Voice generation
○ Video generation
Step 3

Editor.

┌──────────────────────────┐
│                          │
│       Video Preview      │
│                          │
└──────────────────────────┘

Title
[________________]

Script
[________________]

Voice
[Select]

Duration
[60 seconds]

[Regenerate] [Publish]
Screen: Reel Drafts
Route

/app/reels/drafts

Cards
Thumbnail
Title
Last edited
Generation status

Actions:

Edit

Preview

Delete

Publish

Screen: Reel Detail
Route

/app/reels/:id

Content
Video
Title
Description
Author
Source paper
Engagement
Comments
CTA

Read Source Paper

10. Messaging
Screen: Messages
Route

/app/messages

Desktop:

┌────────────────┬─────────────────────────────┐
│ Conversations  │                             │
│                │                             │
│ Alice          │     Select conversation     │
│ Bob            │                             │
│ Research Team  │                             │
└────────────────┴─────────────────────────────┘

Mobile:

Conversation list → Conversation screen.

Screen: Conversation
Route

/app/messages/:conversationId

Header

Avatar + participant name.

Messages
Alice
Have you reviewed the methodology?

                         You
Yes, I found two limitations.
Composer
[Type a message...] 📎 😊 ➤
Actions
Send
Attach file
Mark read
Delete own message
Real-time

Use WebSocket/SSE.

Show:

Alice is typing...
11. Notifications
Screen: Notifications
Route

/app/notifications

Categories:

All | Research | Projects | Social

Examples:

Alice commented on your paper.

Your AI summary is ready.

You were invited to AI Research Project.

Your reel received 20 likes.

Actions:

Mark all as read

Click notification → relevant destination.

12. Profile
Screen: Public Profile
Route

/app/profile/:username

Header
Avatar

Rajvir
@rajvir

AI/ML Researcher

[Follow] [Message]
Stats
12 Papers
340 Followers
128 Following
24 Reels
Tabs
Posts | Research | Reels | Projects
Important security rule

Only expose explicitly public profile fields.

Never render:

password hash
refresh tokens
private API keys
internal account metadata
Screen: My Profile
Route

/app/profile

Actions

Edit Profile

Settings

Sections
Profile information
Research interests
Saved papers
Recent activity
Projects
Reels
13. Settings
Screen: Settings
Route

/app/settings

Sections:

Account
Security
Notifications
Appearance
Privacy
Integrations
Subscription
Screen: Account Settings
Route

/app/settings/account

Fields:

Name
Username
Institution
Bio
Research interests

CTA:

Save Changes

Screen: Security
Route

/app/settings/security

Sections:

Password
Two-factor authentication
Active sessions
Connected accounts

Actions:

Change password
Enable 2FA
Logout all devices
Screen: Notification Settings
Route

/app/settings/notifications

Toggles:

Research recommendations       ON
Project updates                ON
Messages                       ON
Comments                       ON
Reel activity                  OFF
Email notifications            ON
Screen: Appearance
Route

/app/settings/appearance

Options:

○ Light
● Dark
○ System

Also:

Compact/comfortable density
Reduced motion
Screen: Integrations
Route

/app/settings/integrations

Possible integrations:

ORCID
Google
Research databases
AI provider API keys

For API keys:

••••••••••••••••

[Update]
[Remove]

Never display raw secrets.

14. Creation Sheet

Global + action.

Create

📄 Upload Research Paper

🤖 Ask AI

🎬 Create Research Reel

👥 New Project

📝 Create Post

On mobile:

Bottom sheet.

On desktop:

Popover/modal.

15. Modal & Overlay System
Upload Paper Modal

Trigger: Upload button.

Content
Upload Research Paper

Drag & drop PDF here

or

[Choose File]

Maximum file size: XX MB

[Cancel] [Upload]
States
Uploading 64%
Processing document...
Extracting metadata...
Generating embeddings...

Success:

Paper added to your library.

[Open Paper]
AI Processing Modal

Used for long-running AI operations.

Analyzing your paper...

✓ Document loaded
✓ Relevant sections identified
✓ Key findings extracted
○ Generating response

Don't block the entire application unnecessarily. Prefer a background job indicator where possible.

Delete Confirmation Dialog
Delete this document?

This action cannot be undone.

[Cancel] [Delete]

Destructive action should require explicit confirmation.

Share Modal
Share Research

🔗 Copy link

Share to:
LinkedIn
X
Email

Visibility:
○ Public
○ People with link
○ Private
Invite Members Modal
Invite researchers

[Email or username]

Role:
[Researcher ▼]

[Cancel] [Send Invitation]
Filter Sheet

Mobile version of search filters.

Filters

Publication Year
[2020] — [2026]

Topics
☐ AI
☐ NLP
☐ Computer Vision

Open Access
☑

[Reset] [Apply Filters]
16. Global Components

The frontend should establish a reusable design system rather than styling screens independently.

Core components
Button
IconButton
Input
Textarea
Select
Checkbox
Switch
Tabs
Badge
Avatar
Card
Dialog
Drawer
Sheet
Tooltip
Dropdown
Toast
Skeleton
Progress
Pagination
Breadcrumb
EmptyState
ErrorState
SearchBar
PaperCard
UserCard
ProjectCard
ReelCard
MessageBubble
AIResponse
CitationCard
17. Design Tokens
Typography

Recommended:

Display: 40–48px
H1: 32px
H2: 24px
H3: 20px
Body: 15–16px
Caption: 12–13px

Use a clean modern sans-serif.

Recommended:

Inter

Color Strategy

ResearchReel should not look like a generic SaaS admin panel.

Use:

Deep neutral background
White/light surfaces
One strong primary accent
Muted secondary colors
Semantic success/warning/error colors

Dark mode should be first-class.

18. State Management Architecture
Global State

Use global state only for things genuinely shared.

auth
currentUser
theme
sidebar
notifications
activeConversation
Server State

Use TanStack Query for:

papers
projects
tasks
messages
reels
recommendations
profile
notifications
Local State

Keep inside components:

form values
modal open/close
search input
selected filters
document viewer page
AI composer
19. Optimistic Updates

Use optimistic UI for:

Like
Click Like
↓
Immediately update count
↓
API request
↓
Rollback if failed
Save paper

Immediate visual state change.

Mark notification read

Immediate removal from unread state.

Send message

Add temporary message:

Sending...

Then replace with server-confirmed message.

20. Skeleton Strategy

Use skeletons for:

Home dashboard
Paper cards
Profile
Project cards
Search results
Reel feed
Messages

Use spinners for:

Button-level actions
Small operations
Form submissions

Example:

[ Save ] → [Saving...] → [Saved ✓]

Do not replace an entire page with a spinner when the layout is already known.

21. Error Architecture

Create one reusable:

<ErrorState />
API error
Something went wrong.

We couldn't load your research.

[Try Again]
Network error

Persistent top banner:

⚠ You're offline.
Changes will sync when you're back online.
Server error
ResearchReel is having trouble connecting.

[Retry]
22. Authentication Expiry Flow

Every authenticated API request should handle:

401 Unauthorized
        ↓
Try refresh
        ↓
Refresh successful?
    /          \
   YES          NO
    ↓            ↓
retry request   clear auth
                 ↓
             /login

The frontend should preserve useful unsaved state where possible.

23. Permission Handling

For protected screens:

Authenticated
      ↓
Role / ownership check
      ↓
Authorized?
   /       \
 YES       NO
 ↓          ↓
Render    403 screen

Example:

You don't have permission
to access this project.

[Back to Projects]

Don't rely solely on hiding buttons. Backend authorization must remain authoritative.

24. Critical Security UX Requirements

Given the backend audit, the frontend should be designed around server-authoritative authorization.

Never trust:
userId from URL
userId from request body
project owner from client
senderId from client
authorId from client
role from client

Frontend should simply operate on the authenticated user's session.

Authentication storage

Prefer:

HttpOnly Secure Cookie

rather than exposing JWTs to JavaScript/localStorage.

The frontend should not need:

localStorage.setItem("token", ...)

for the primary authentication mechanism.

25. Deep Links

Support:

/research/:doi
/papers/:id
/projects/:id
/reels/:id
/users/:username
/messages/:conversationId

Examples:

researchreel.com/papers/123

researchreel.com/projects/456

researchreel.com/reels/789

Unauthenticated user:

Deep link
↓
Login
↓
Return to original URL
26. User Journey Flows
Flow 1: New User → First Research Paper
Landing
   ↓
Get Started
   ↓
Register
   ↓
Verify Email
   ↓
Home
   ↓
Upload Paper
   ↓
Upload Modal
   ↓
Processing
   ↓
Document Reader
   ↓
AI Summary
   ↓
Save to Library
   ↓
Home
Flow 2: Research Paper → AI → Research Reel
Discover
   ↓
Search Paper
   ↓
Paper Details
   ↓
Open Paper
   ↓
Document Reader
   ↓
Ask AI
   ↓
AI Response
   ↓
Generate Reel
   ↓
Select Reel Style
   ↓
AI Processing
   ↓
Reel Editor
   ↓
Preview
   ↓
Publish
   ↓
Reels Feed
Flow 3: Collaborative Research
Projects
   ↓
New Project
   ↓
Project Setup
   ↓
Invite Members
   ↓
Project Overview
   ↓
Add Papers
   ↓
Create Tasks
   ↓
Assign Researcher
   ↓
Task In Progress
   ↓
Upload Research Result
   ↓
Project Activity
   ↓
Task Completed
Flow 4: Research Discussion
Discover
   ↓
Researcher Profile
   ↓
Follow / Message
   ↓
Conversation
   ↓
Send Message
   ↓
Real-time Delivery
   ↓
Notification
Flow 5: Session Expiration
Any Screen
   ↓
API Request
   ↓
401
   ↓
Refresh Session
   ↓
Success?
  /   \
YES    NO
 ↓      ↓
Retry  Login
        ↓
Preserve return URL
        ↓
Authentication
        ↓
Return to previous screen
27. Edge Cases
No Internet

Show:

⚠ You're offline

Previously loaded research remains readable.

Disable operations requiring server access.

Empty Library
Your research library is empty.

Start building your research collection.

[Upload Your First Paper]
No Search Results
No papers found for "quantum transformer".

Try broader keywords.

[Clear Filters]
AI Failure
We couldn't generate the answer.

Your paper is still safe.

[Try Again]
AI Rate Limit
You've reached today's AI usage limit.

Try again later or upgrade your plan.
File Upload Failure
Upload failed.

The file may be too large or unsupported.

[Try Again]
Permission Denied
You don't have access to this research.

[Back]
Deleted Resource
This paper is no longer available.

[Return to Library]
28. Accessibility

Every interactive element should have:

Keyboard accessibility
Visible focus state
ARIA labels for icon-only buttons
Minimum ~44px touch target
Semantic headings
Proper form labels
Screen-reader announcements for AI processing
Accessible modal focus trapping

Example:

🔔

must have:

aria-label="Notifications"

rather than relying on the icon.

29. Responsive Breakpoints

Recommended:

Mobile:   < 640px
Tablet:   640–1024px
Desktop:  1024–1440px
Large:    >1440px
Mobile
Bottom navigation
Sheets instead of large dialogs
Single-column cards
Document/AI tabs
Tablet
Collapsible sidebar
Two-column layouts
Desktop
Persistent sidebar
Multi-panel research workspace
Keyboard shortcuts
30. Keyboard Shortcuts

Power users should be able to use:

/       Focus search
N       New research item
A       Ask AI
U       Upload
G H     Go Home
G D     Discover
G L     Library
G P     Projects
G R     Reels
G M     Messages
Esc     Close modal

Show shortcut hints in tooltips.

31. Important Frontend Architecture

Recommended Next.js structure:

frontend/
│
├── app/
│   ├── (marketing)/
│   │   └── page.tsx
│   │
│   ├── auth/
│   │   ├── login/
│   │   ├── register/
│   │   └── verify-email/
│   │
│   └── app/
│       ├── layout.tsx
│       ├── home/
│       ├── discover/
│       ├── search/
│       ├── library/
│       ├── ai/
│       ├── projects/
│       ├── reels/
│       ├── messages/
│       ├── notifications/
│       ├── profile/
│       └── settings/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── auth/
│   ├── research/
│   ├── ai/
│   ├── projects/
│   ├── reels/
│   ├── messaging/
│   └── profile/
│
├── hooks/
│   ├── useAuth.ts
│   ├── usePapers.ts
│   ├── useProjects.ts
│   ├── useAI.ts
│   └── useMessages.ts
│
├── lib/
│   ├── api/
│   ├── auth/
│   ├── websocket/
│   └── utils/
│
├── stores/
│   ├── authStore.ts
│   ├── uiStore.ts
│   └── researchStore.ts
│
└── types/
32. Recommended Component Hierarchy
AppShell
│
├── Sidebar
│   ├── Logo
│   ├── PrimaryNavigation
│   └── UserMenu
│
├── TopBar
│   ├── GlobalSearch
│   ├── NotificationButton
│   └── Avatar
│
└── MainContent
    │
    ├── PageHeader
    ├── PageContent
    └── MobileBottomNav

For research:

ResearchWorkspace
│
├── DocumentSidebar
├── DocumentViewer
└── AICopilot

This component should become a reusable foundation for the entire research experience.

33. The Most Important UX Principle

ResearchReel should not feel like 15 disconnected features.

The experience should revolve around one loop:

DISCOVER
   ↓
READ
   ↓
UNDERSTAND WITH AI
   ↓
SAVE / ORGANIZE
   ↓
COLLABORATE
   ↓
CREATE RESEARCH CONTENT
   ↓
SHARE
   ↓
DISCOVER MORE RESEARCH

That is the product's core UX loop.

34. Recommended Primary Dashboard

If I were designing the actual production UI, I'd make the home screen roughly:

┌─────────────────────────────────────────────────────────────┐
│ ResearchReel       Search research...          🔔  RA       │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│ 🏠 Home       │  Good morning, Rajvir                      │
│ 🔎 Discover   │                                             │
│ 📚 Library    │  ┌───────────────────────────────────────┐  │
│ 🤖 AI         │  │  What are you researching today?      │  │
│ 👥 Projects   │  │                                       │  │
│ 🎬 Reels      │  │  Ask ResearchReel AI...          ➤    │  │
│ 💬 Messages   │  └───────────────────────────────────────┘  │
│               │                                             │
│               │  Continue Researching                       │
│               │  ┌────────┐ ┌────────┐ ┌────────┐          │
│               │  │ Paper 1│ │ Paper 2│ │ Paper 3│          │
│               │  └────────┘ └────────┘ └────────┘          │
│               │                                             │
│               │  Recommended Research                       │
│               │  ┌───────────────────────────────────────┐  │
│               │  │ Paper                                  │  │
│               │  │ Paper                                  │  │
│               │  └───────────────────────────────────────┘  │
│               │                                             │
│ ⚙ Settings    │  Active Projects       Recent Reels         │
└───────────────┴─────────────────────────────────────────────┘

The AI Research Copilot should be the visual center of the product, while Discover, Library, Projects, and Reels form the surrounding ecosystem.

Final product positioning

The frontend should communicate this in seconds:

ResearchReel isn't just where you read papers. It's where you discover research, understand it with AI, work on it with others, and turn it into something people can actually engage with.