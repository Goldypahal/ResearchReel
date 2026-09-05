const pool = require('../config/db');
const { canAccessWorkspace } = require('../authorization/workspaceAuthorization');
const { sendSuccess, sendError } = require('../utils/response');

// Create Workspace (Section 41 / 42)
exports.createWorkspace = async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user.id; // Authentication strictly required

    if (!name || name.trim().length === 0) {
      return sendError(res, 'Workspace name is required.', 400, 'VALIDATION_ERROR', req);
    }

    const wsRes = await pool.query(
      'INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING *',
      [name, userId]
    );
    const workspace = wsRes.rows[0];

    // Add owner membership record
    await pool.query(
      'INSERT INTO workspace_members (workspace_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
      [workspace.id, userId, 'owner']
    );

    return sendSuccess(res, workspace, 'Workspace created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

// List User Workspaces (Section 41)
exports.getWorkspaces = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const workspaces = await pool.query(`
      SELECT DISTINCT w.*, wm.role as user_role
      FROM workspaces w
      LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE w.owner_id = $1 OR wm.user_id = $1
      ORDER BY w.updated_at DESC;
    `, [userId]);

    return sendSuccess(res, workspaces.rows, 'Workspaces retrieved.');
  } catch (error) {
    next(error);
  }
};

// Get Single Workspace
exports.getWorkspaceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allowed, role } = await canAccessWorkspace(req.user.id, id);
    if (!allowed) {
      return sendError(res, 'Forbidden: You do not have access to this workspace.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const ws = await pool.query('SELECT * FROM workspaces WHERE id = $1', [id]);
    if (ws.rows.length === 0) {
      return sendError(res, 'Workspace not found.', 404, 'NOT_FOUND', req);
    }

    return sendSuccess(res, { ...ws.rows[0], user_role: role }, 'Workspace details retrieved.');
  } catch (error) {
    next(error);
  }
};

// Update Workspace
exports.updateWorkspace = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const { allowed, isOwner } = await canAccessWorkspace(req.user.id, id);
    if (!allowed || !isOwner) {
      return sendError(res, 'Forbidden: Only workspace owner can update workspace details.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const updatedWs = await pool.query(
      'UPDATE workspaces SET name = COALESCE($1, name), updated_at = NOW() WHERE id = $2 RETURNING *',
      [name, id]
    );

    return sendSuccess(res, updatedWs.rows[0], 'Workspace updated successfully.');
  } catch (error) {
    next(error);
  }
};
