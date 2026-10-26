const pool = require('../config/db');
const { canAccessProject } = require('../authorization/projectAuthorization');
const { canAccessDocument } = require('../authorization/documentAuthorization');
const { notify } = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/response');

const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
const RANK = { viewer: 1, editor: 2, owner: 3 };
const MEMBER_ROLES = ['editor', 'viewer'];

/** Resolves access and enforces a minimum role. Returns role or sends the error response. */
const requireRole = async (req, res, minRole) => {
  const projectId = req.params.id;
  if (!isUuid(projectId)) { sendError(res, 'Project not found.', 404, 'NOT_FOUND', req); return null; }
  const { allowed, role } = await canAccessProject(req.user.id, projectId);
  if (!allowed) { sendError(res, 'Project not found.', 404, 'NOT_FOUND', req); return null; }
  if ((RANK[role] || 0) < RANK[minRole]) {
    sendError(res, minRole === 'owner' ? 'Only the project owner can do that.' : 'Viewers can\'t change this project.', 403, 'AUTHORIZATION_ERROR', req);
    return null;
  }
  return role;
};

const membersOf = async (projectId) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.full_name, COALESCE(u.avatar_url, u.profile_picture_url) AS avatar_url,
            u.verification_status, u.institution,
            CASE WHEN p.creator_id = u.id THEN 'owner' ELSE pm.role END AS role, pm.joined_at
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     JOIN projects p ON p.id = pm.project_id
     WHERE pm.project_id = $1
     ORDER BY (p.creator_id = u.id) DESC, pm.joined_at ASC`,
    [projectId]
  );
  return rows;
};

const papersOf = async (projectId) => {
  const { rows } = await pool.query(
    `SELECT d.id, d.title, d.abstract, d.doi, d.status, d.file_type, d.created_at,
            pd.added_at, u.username AS added_by_username
     FROM project_documents pd
     JOIN documents d ON d.id = pd.document_id AND d.deleted_at IS NULL
     LEFT JOIN users u ON u.id = pd.added_by
     WHERE pd.project_id = $1
     ORDER BY pd.added_at DESC`,
    [projectId]
  );
  return rows;
};

/** Project with members, papers and task counts — everything the project page needs. */
exports.getProjectDetail = async (req, res, next) => {
  try {
    const role = await requireRole(req, res, 'viewer');
    if (!role) return;
    const { rows } = await pool.query(
      `SELECT p.*,
              (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id) AS task_count,
              (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') AS done_count
       FROM projects p WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!rows[0]) return sendError(res, 'Project not found.', 404, 'NOT_FOUND', req);
    const [members, papers] = await Promise.all([membersOf(req.params.id), papersOf(req.params.id)]);
    return sendSuccess(res, { ...rows[0], user_role: role, members, papers }, 'Project details retrieved.');
  } catch (error) { next(error); }
};

exports.updateProject = async (req, res, next) => {
  try {
    if (!(await requireRole(req, res, 'owner'))) return;
    const { name, description, research_field, visibility } = req.body || {};
    if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 200)) {
      return sendError(res, 'Project name must be 1-200 characters.', 400, 'VALIDATION_ERROR', req);
    }
    if (visibility !== undefined && !['public', 'private'].includes(visibility)) {
      return sendError(res, 'visibility must be public or private.', 400, 'VALIDATION_ERROR', req);
    }
    const { rows } = await pool.query(
      `UPDATE projects SET name = COALESCE($2, name), description = COALESCE($3, description),
              research_field = COALESCE($4, research_field), visibility = COALESCE($5, visibility), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, name !== undefined ? name.trim() : null, description !== undefined ? String(description).slice(0, 2000) : null,
        research_field !== undefined ? String(research_field).slice(0, 100) : null, visibility || null]
    );
    return sendSuccess(res, rows[0], 'Project updated.');
  } catch (error) { next(error); }
};

exports.addMember = async (req, res, next) => {
  try {
    if (!(await requireRole(req, res, 'owner'))) return;
    const username = String((req.body || {}).username || '').trim().replace(/^@/, '');
    const role = (req.body || {}).role || 'editor';
    if (!username) return sendError(res, 'username is required.', 400, 'VALIDATION_ERROR', req);
    if (!MEMBER_ROLES.includes(role)) return sendError(res, 'role must be editor or viewer.', 400, 'VALIDATION_ERROR', req);

    const u = await pool.query(
      "SELECT id FROM users WHERE lower(username) = lower($1) AND (is_deleted IS NULL OR is_deleted = FALSE) AND verification_status <> 'unverified'",
      [username]
    );
    if (!u.rows[0]) return sendError(res, `No researcher called @${username}.`, 404, 'NOT_FOUND', req);
    const inserted = await pool.query(
      `INSERT INTO project_members (project_id, user_id, role, joined_at) VALUES ($1, $2, $3, NOW())
       ON CONFLICT DO NOTHING RETURNING user_id`,
      [req.params.id, u.rows[0].id, role]
    );
    if (!inserted.rows.length) return sendError(res, `@${username} is already on this project.`, 409, 'CONFLICT_ERROR', req);
    await notify({ userId: u.rows[0].id, actorId: req.user.id, type: 'project_invite', entityType: 'project', entityId: req.params.id });
    return sendSuccess(res, await membersOf(req.params.id), 'Member added.', 201);
  } catch (error) { next(error); }
};

exports.updateMember = async (req, res, next) => {
  try {
    if (!(await requireRole(req, res, 'owner'))) return;
    const { role } = req.body || {};
    if (!MEMBER_ROLES.includes(role)) return sendError(res, 'role must be editor or viewer.', 400, 'VALIDATION_ERROR', req);
    if (!isUuid(req.params.userId)) return sendError(res, 'Member not found.', 404, 'NOT_FOUND', req);
    const { rowCount } = await pool.query(
      `UPDATE project_members pm SET role = $3 FROM projects p
       WHERE pm.project_id = $1 AND pm.user_id = $2 AND p.id = pm.project_id AND p.creator_id <> pm.user_id`,
      [req.params.id, req.params.userId, role]
    );
    if (!rowCount) return sendError(res, 'Member not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, await membersOf(req.params.id), 'Role updated.');
  } catch (error) { next(error); }
};

/** Owner removes someone, or a member leaves. The owner can't be removed. */
exports.removeMember = async (req, res, next) => {
  try {
    const self = req.params.userId === req.user.id;
    if (!(await requireRole(req, res, self ? 'viewer' : 'owner'))) return;
    if (!isUuid(req.params.userId)) return sendError(res, 'Member not found.', 404, 'NOT_FOUND', req);
    const { rowCount } = await pool.query(
      `DELETE FROM project_members pm USING projects p
       WHERE pm.project_id = $1 AND pm.user_id = $2 AND p.id = pm.project_id AND p.creator_id <> pm.user_id`,
      [req.params.id, req.params.userId]
    );
    if (!rowCount) return sendError(res, self ? 'The owner can\'t leave their own project.' : 'Member not found.', 400, 'VALIDATION_ERROR', req);
    await pool.query('UPDATE tasks SET assigned_to = NULL WHERE project_id = $1 AND assigned_to = $2', [req.params.id, req.params.userId]);
    return sendSuccess(res, self ? [] : await membersOf(req.params.id), self ? 'You left the project.' : 'Member removed.');
  } catch (error) { next(error); }
};

/** Attach a paper you can read; project members then get access to it. */
exports.addPaper = async (req, res, next) => {
  try {
    if (!(await requireRole(req, res, 'editor'))) return;
    const documentId = (req.body || {}).document_id;
    const { allowed } = await canAccessDocument(req.user.id, documentId);
    if (!allowed) return sendError(res, 'You can only add papers you have access to.', 403, 'AUTHORIZATION_ERROR', req);
    await pool.query(
      'INSERT INTO project_documents (project_id, document_id, added_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [req.params.id, documentId, req.user.id]
    );
    return sendSuccess(res, await papersOf(req.params.id), 'Paper added to project.', 201);
  } catch (error) { next(error); }
};

exports.removePaper = async (req, res, next) => {
  try {
    if (!(await requireRole(req, res, 'editor'))) return;
    if (!isUuid(req.params.documentId)) return sendError(res, 'Paper not found.', 404, 'NOT_FOUND', req);
    await pool.query('DELETE FROM project_documents WHERE project_id = $1 AND document_id = $2', [req.params.id, req.params.documentId]);
    return sendSuccess(res, await papersOf(req.params.id), 'Paper removed from project.');
  } catch (error) { next(error); }
};

exports.isUuid = isUuid;
exports.RANK = RANK;
