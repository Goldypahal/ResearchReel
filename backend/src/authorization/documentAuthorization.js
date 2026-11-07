const pool = require('../config/db');
const { AuthorizationError, NotFoundError } = require('../utils/errors');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates document access permission for a given user
 * Checks: 1. Owner, 2. Project Member via project_documents junction, 3. Public visibility
 */
async function canAccessDocument(userId, documentId) {
  if (!documentId || !UUID_RE.test(String(documentId))) return { allowed: false, permission: null };

  // A paper can be shared to several projects; the user may belong to any of them.
  const query = `
    SELECT d.id, d.uploader_id AS owner_id, d.visibility,
           (SELECT CASE WHEN bool_or(pm.role <> 'viewer') THEN 'editor' WHEN count(pm.role) > 0 THEN 'viewer' END
              FROM project_documents pd
              JOIN project_members pm ON pm.project_id = pd.project_id AND pm.user_id = $2
             WHERE pd.document_id = d.id) AS project_permission
      FROM documents d
     WHERE d.id = $1 AND d.deleted_at IS NULL
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

  // Project member access
  if (row.project_permission) {
    return { allowed: true, permission: row.project_permission };
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
