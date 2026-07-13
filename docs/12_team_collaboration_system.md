# ResearchReel — Enterprise Team Collaboration & RBAC Architecture

This document specifies the collaboration system, role-based access control (RBAC), and team workspace structures for ResearchReel V1.0 Enterprise.

---

## 1. Role-Based Access Control (RBAC) System
Access is governed by a roles hierarchy within organizations and workspaces:
* **Organization Roles**:
  * **Owner**: Billing owner. Full controls over billing, team seats, and security.
  * **Admin**: Manages invitations, user status updates, and workspace creations.
  * **Member**: Standard user account within the organization.
* **Workspace Specific Roles**:
  * **Workspace Owner**: Creates the workspace. Full access to delete or rename it.
  * **Editor**: Can upload papers, edit scripts, render drafts, and move Kanban cards.
  * **Reviewer**: Can view drafts, annotate PDFs, and comment on task cards.
  * **Viewer**: Read-only access to files and boards.

---

## 2. Workspace Permissions Matrix

| Operations | Owner | Admin | Editor | Reviewer | Viewer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Delete Workspace** | Yes | No | No | No | No |
| **Add Collaborators** | Yes | Yes | No | No | No |
| **Upload Research PDFs** | Yes | Yes | Yes | No | No |
| **Create/Edit Reel Drafts** | Yes | Yes | Yes | No | No |
| **Run Video Rendering** | Yes | Yes | Yes | No | No |
| **Add Annotations / Sticky Notes**| Yes | Yes | Yes | Yes | No |
| **Move Kanban Task Cards** | Yes | Yes | Yes | No | No |
| **View Workspace Data** | Yes | Yes | Yes | Yes | Yes |

---

## 3. Collaboration & Communication Elements

### 3.1 Real-time Notifications & Sockets
* **Mentions Framework**: Mentioning a user (e.g. `@Alice`) in task cards or comments writes an entry to notifications and publishes an event to Socket.IO.
* **Collaboration Presence**: WebSockets track active users within a workspace, showing profile circles in the top bar.

### 3.2 Workspace Invitations Pipeline
1. **Request**: Admin submits email and role to `POST /api/v1/projects/:id/invite`.
2. **Token Generation**: System creates invitation tokens with 7-day expirations.
3. **Dispatch**: Sends invitation email containing token link.
4. **Acceptance**: Clicking the link maps the user's account to the workspace member table.
