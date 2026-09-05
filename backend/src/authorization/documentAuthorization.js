const pool = require('../config/db');
const { AuthorizationError, NotFoundError } = require('../utils/errors');

/**
 * Validates document access permission for a given user
 * Checks: 1. Owner, 2. Project Member via project_documents junction, 3. Public visibility
 */
async function canAccessDocument(userId, documentId) {
  if (!documentId) return { allowed: false, permission: null };

  const query = `
    SELECT 
      d.id, 
      d.owner_id, 
      d.visibility,
      pd.project_id,
      pm.role as project_role
    FROM documents d
    LEFT JOIN project_documents pd ON pd.document_id = d.id
    LEFT JOIN project_members pm ON pm.project_id = pd.project_id AND pm.user_id = $2
    WHERE d.id = $1 AND (d.deleted_at IS NULL);
  `;

  const result = await pool.query(query, [documentId, userId]);
  if (result.rows.length === 0) {
    return { allowed: false, permission: null };
  }

  const row = result.rows[0];

  // Document owner
  if (userId && row.owner_id === userId) {
    return { allowed: true, permission: 'owner' };
  }

  // Project member access
  if (row.project_role) {
    return { allowed: true, permission: row.project_role === 'viewer' ? 'viewer' : 'editor' };
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
