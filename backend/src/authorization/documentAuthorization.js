const pool = require('../config/db');
const { AuthorizationError, NotFoundError } = require('../utils/errors');

/**
 * Validates document access permission for a given user
 * `via` says why: owner | project | post | public. Drafts and version
 * history are only for owner/project collaborators, not public readers.
 * Checks: 1. Owner, 2. Project member (via project_documents), 3. Shared in a live post, 4. Public visibility
 */
async function canAccessDocument(userId, documentId) {
  if (!documentId || !/^[0-9a-f-]{36}$/i.test(String(documentId))) return { allowed: false, permission: null };

  // Project access counts as collaboration only in projects the paper's owner
  // belongs to. A paper someone else added (e.g. a public paper on a reading
  // list) is read-only there, and never exposes drafts or version history.
  const query = `
    SELECT d.id, d.uploader_id AS owner_id, d.visibility,
           (SELECT pm.role FROM project_documents pd
              JOIN project_members pm ON pm.project_id = pd.project_id AND pm.user_id = $2
              JOIN projects pr ON pr.id = pd.project_id AND pr.deleted_at IS NULL
             WHERE pd.document_id = d.id
               AND (pr.creator_id = d.uploader_id
                    OR EXISTS (SELECT 1 FROM project_members om WHERE om.project_id = pd.project_id AND om.user_id = d.uploader_id))
             ORDER BY (pm.role = 'viewer') ASC LIMIT 1) AS project_role,
           EXISTS (SELECT 1 FROM project_documents pd
                     JOIN project_members pm ON pm.project_id = pd.project_id AND pm.user_id = $2
                     JOIN projects pr ON pr.id = pd.project_id AND pr.deleted_at IS NULL
                    WHERE pd.document_id = d.id) AS in_my_project,
           EXISTS (SELECT 1 FROM posts p WHERE p.document_id = d.id AND p.deleted_at IS NULL) AS shared_in_post
    FROM documents d
    WHERE d.id = $1 AND d.deleted_at IS NULL;
  `;

  const result = await pool.query(query, [documentId, userId || null]);
  if (result.rows.length === 0) {
    return { allowed: false, permission: null };
  }

  const row = result.rows[0];

  // Document owner
  if (userId && row.owner_id === userId) {
    return { allowed: true, permission: 'owner', via: 'owner' };
  }

  // Project member access (best role across every project the paper is in)
  if (row.project_role) {
    return { allowed: true, permission: row.project_role === 'viewer' ? 'viewer' : 'editor', via: 'project' };
  }

  // On a reading list in one of the caller's projects (owner not a collaborator).
  if (row.in_my_project) {
    return { allowed: true, permission: 'viewer', via: 'reading-list' };
  }

  // Sharing a paper in a post makes it readable to the people who see that post.
  if (row.shared_in_post) {
    return { allowed: true, permission: 'viewer', via: 'post' };
  }

  // Public document view permission
  if (row.visibility === 'public') {
    return { allowed: true, permission: 'viewer', via: 'public' };
  }

  return { allowed: false, permission: null };
}

/**
 * Documents a user may query with AI when they don't pick one paper:
 * their own, their projects', public ones and ones shared in a live post.
 * Only papers already in the AI index matter. Capped so the filter stays small.
 */
async function accessibleIndexedDocumentIds(userId, cap = 1000) {
  const { rows } = await pool.query(
    `SELECT d.id FROM documents d
      WHERE d.deleted_at IS NULL AND d.rag_indexed_at IS NOT NULL
        AND (d.uploader_id = $1
             OR d.visibility = 'public'
             OR EXISTS (SELECT 1 FROM project_documents pd
                          JOIN project_members pm ON pm.project_id = pd.project_id AND pm.user_id = $1
                         WHERE pd.document_id = d.id)
             OR EXISTS (SELECT 1 FROM posts p WHERE p.document_id = d.id AND p.deleted_at IS NULL))
      ORDER BY (d.uploader_id = $1) DESC, d.created_at DESC
      LIMIT $2`,
    [userId, cap]
  );
  return rows.map((r) => r.id);
}

/**
 * Middleware enforcing document access checks
 */
const authorizeDocumentAccess = (requiredPermission = 'viewer') => {
  return async (req, res, next) => {
    try {
      const documentId = req.params.id || req.params.documentId || req.body.documentId || req.body.document_id;
      if (!documentId) {
        throw new NotFoundError('Document ID is required');
      }

      const { allowed, permission } = await canAccessDocument(req.user?.id, documentId);
      if (!allowed) {
        throw new AuthorizationError('You do not have authorization to access this research document');
      }

      if (requiredPermission === 'editor' && permission === 'viewer') {
        throw new AuthorizationError('Read-only access: edit permission required');
      }

      req.documentPermission = permission;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  canAccessDocument,
  accessibleIndexedDocumentIds,
  authorizeDocumentAccess
};
