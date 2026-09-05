const pool = require('../config/db');
const { AuthorizationError, NotFoundError } = require('../utils/errors');

/**
 * Checks workspace ownership or membership
 */
async function canAccessWorkspace(userId, workspaceId) {
  if (!userId || !workspaceId) return { allowed: false, isOwner: false };

  const query = `
    SELECT w.id, w.owner_id, wm.role 
    FROM workspaces w
    LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = $2
    WHERE w.id = $1;
  `;
  const result = await pool.query(query, [workspaceId, userId]);
  if (result.rows.length === 0) {
    return { allowed: false, isOwner: false };
  }

  const ws = result.rows[0];
  if (ws.owner_id === userId) {
    return { allowed: true, isOwner: true, role: 'owner' };
  }

  if (ws.role) {
    return { allowed: true, isOwner: false, role: ws.role };
  }

  return { allowed: false, isOwner: false };
}

const authorizeWorkspaceAccess = () => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.id || req.body.workspaceId;
      if (!workspaceId) {
        throw new NotFoundError('Workspace ID is required');
      }

      const { allowed, role } = await canAccessWorkspace(req.user.id, workspaceId);
      if (!allowed) {
        throw new AuthorizationError('You do not have access to this workspace');
      }

      req.workspaceRole = role;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  canAccessWorkspace,
  authorizeWorkspaceAccess
};
