const pool = require('../config/db');
const { AuthorizationError, NotFoundError } = require('../utils/errors');

/**
 * Validates whether a user can access a project and returns their role
 * @param {string} userId - UUID of requesting user
 * @param {string} projectId - UUID of project
 * @returns {Promise<{ allowed: boolean, role: string }>}
 */
async function canAccessProject(userId, projectId) {
  if (!userId || !projectId) return { allowed: false, role: null };

  const query = `
    SELECT p.id, p.creator_id, pm.role
    FROM projects p
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
    WHERE p.id = $1 AND (p.deleted_at IS NULL OR p.deleted_at > NOW());
  `;

  const result = await pool.query(query, [projectId, userId]);
  if (result.rows.length === 0) {
    return { allowed: false, role: null };
  }

  const row = result.rows[0];
  if (row.creator_id === userId) {
    return { allowed: true, role: 'owner' };
  }

  if (row.role) {
    return { allowed: true, role: row.role };
  }

  return { allowed: false, role: null };
}

/**
 * Middleware enforcing project authorization
 */
const authorizeProjectAccess = (requiredRole = null) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.id || req.params.projectId || req.body.projectId;
      if (!projectId) {
        throw new NotFoundError('Project ID is required');
      }

      const { allowed, role } = await canAccessProject(req.user.id, projectId);
      if (!allowed) {
        throw new AuthorizationError('You do not have permission to access this project');
      }

      req.projectRole = role;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  canAccessProject,
  authorizeProjectAccess
};
