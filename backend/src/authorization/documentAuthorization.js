const pool = require('../config/db');
const { AuthorizationError, NotFoundError } = require('../utils/errors');

/**
 * Validates document access permission for a given user
 * Checks: 1. Owner, 2. Project member (via project_documents), 3. Shared in a live post, 4. Public visibility
 */
async function canAccessDocument(userId, documentId) {
  if (!documentId || !/^[0-9a-f-]{36}$/i.test(String(documentId))) return { allowed: false, permission: null };

  const query = `
    SELECT d.id, d.uploader_id AS owner_id, d.visibility,
           (SELECT pm.role FROM project_documents pd
              JOIN project_members pm ON pm.project_id = pd.project_id AND pm.user_id = $2
             WHERE pd.document_id = d.id
             ORDER BY (pm.role = 'viewer') ASC LIMIT 1) AS project_role,
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
    return { allowed: true, permission: 'owner' };
  }

  // Project member access (best role across every project the paper is in)
  if (row.project_role) {
    return { allowed: true, permission: row.project_role === 'viewer' ? 'viewer' : 'editor' };
  }

  // Sharing a paper in a post makes it readable to the people who see that post.
  if (row.shared_in_post) {
    return { allowed: true, permission: 'viewer' };
  }

  // Public document view permission
  if (row.visibility === 'public') {
    return { allowed: true, permission: 'viewer' };
  }

  return { allowed: false, permission: null };
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
  authorizeDocumentAccess
};
