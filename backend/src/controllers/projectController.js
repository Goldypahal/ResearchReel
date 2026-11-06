const db = require('../config/db');
const { canAccessProject } = require('../authorization/projectAuthorization');
const { canAccessDocument } = require('../authorization/documentAuthorization');
const { notify } = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/response');
const { isUuid } = require('../utils/pagination');

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const ROLES = ['owner', 'editor', 'viewer'];

const PROJECT_SELECT = `
  SELECT p.*, u.username AS creator_username, u.full_name AS creator_name,
         (SELECT COUNT(*)::int FROM project_members m WHERE m.project_id = p.id) AS member_count,
         (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id) AS task_count,
         (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') AS done_count,
         (SELECT COUNT(*)::int FROM project_documents d WHERE d.project_id = p.id) AS document_count
    FROM projects p JOIN users u ON u.id = p.creator_id
`;

const requireAccess = async (req, res, projectId, { write = false, owner = false } = {}) => {
  if (!isUuid(projectId)) { sendError(res, 'Project not found.', 404, 'NOT_FOUND', req); return null; }
  const { allowed, role } = await canAccessProject(req.user.id, projectId);
  if (!allowed) { sendError(res, 'Project not found.', 404, 'NOT_FOUND', req); return null; }
  if (owner && role !== 'owner') { sendError(res, 'Only the project owner can do that.', 403, 'AUTHORIZATION_ERROR', req); return null; }
  if (write && role === 'viewer') { sendError(res, 'You have view-only access to this project.', 403, 'AUTHORIZATION_ERROR', req); return null; }
  return role;
};

exports.getProjects = async (req, res, next) => {
  try {
    const r = await db.query(
      `${PROJECT_SELECT.replace('SELECT p.*,', 'SELECT p.*, pm.role AS user_role,')}
         JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
        WHERE p.deleted_at IS NULL ORDER BY p.updated_at DESC`,
      [req.user.id]
    );
    return sendSuccess(res, r.rows, 'Projects.');
  } catch (error) {
    next(error);
  }
};

exports.createProject = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const name = String(req.body.name || '').trim().slice(0, 200);
    if (!name) return sendError(res, 'Project name is required.', 400, 'VALIDATION_ERROR', req);
    const visibility = req.body.visibility === 'public' ? 'public' : 'private';
    await client.query('BEGIN');
    const p = await client.query(
      `INSERT INTO projects (creator_id, name, description, research_field, visibility) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.user.id, name, String(req.body.description || '').slice(0, 5000), String(req.body.research_field || '').slice(0, 120) || null, visibility]
    );
    await client.query(`INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'owner')`, [p.rows[0].id, req.user.id]);
    await client.query('COMMIT');
    const out = await db.query(`${PROJECT_SELECT} WHERE p.id = $1`, [p.rows[0].id]);
    return sendSuccess(res, { ...out.rows[0], user_role: 'owner' }, 'Project created.', 201);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
  }
};

exports.getProjectById = async (req, res, next) => {
  try {
    const role = await requireAccess(req, res, req.params.id);
    if (!role) return;
    const r = await db.query(`${PROJECT_SELECT} WHERE p.id = $1 AND p.deleted_at IS NULL`, [req.params.id]);
    if (!r.rows[0]) return sendError(res, 'Project not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, { ...r.rows[0], user_role: role }, 'Project.');
  } catch (error) {
    next(error);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const role = await requireAccess(req, res, req.params.id, { owner: true });
    if (!role) return;
    const b = req.body || {};
    await db.query(
      `UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description),
              research_field = COALESCE($3, research_field), visibility = COALESCE($4, visibility), updated_at = NOW()
        WHERE id = $5`,
      [b.name ? String(b.name).trim().slice(0, 200) : null, b.description !== undefined ? String(b.description).slice(0, 5000) : null,
        b.research_field !== undefined ? String(b.research_field).slice(0, 120) : null,
        ['public', 'private'].includes(b.visibility) ? b.visibility : null, req.params.id]
    );
    const r = await db.query(`${PROJECT_SELECT} WHERE p.id = $1`, [req.params.id]);
    return sendSuccess(res, { ...r.rows[0], user_role: role }, 'Project updated.');
  } catch (error) {
    next(error);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const role = await requireAccess(req, res, req.params.id, { owner: true });
    if (!role) return;
    await db.query('UPDATE projects SET deleted_at = NOW() WHERE id = $1', [req.params.id]);
    return sendSuccess(res, { id: req.params.id }, 'Project deleted.');
  } catch (error) {
    next(error);
  }
};

// Members ---------------------------------------------------------------
exports.getMembers = async (req, res, next) => {
  try {
    if (!(await requireAccess(req, res, req.params.id))) return;
    const r = await db.query(
      `SELECT u.id, u.username, u.full_name, u.profile_picture_url AS avatar_url, u.verification_status, m.role, m.joined_at
         FROM project_members m JOIN users u ON u.id = m.user_id
        WHERE m.project_id = $1 ORDER BY (m.role = 'owner') DESC, m.joined_at ASC`,
      [req.params.id]
    );
    return sendSuccess(res, r.rows, 'Members.');
  } catch (error) {
    next(error);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    if (!(await requireAccess(req, res, req.params.id, { owner: true }))) return;
    const role = ROLES.includes(req.body.role) && req.body.role !== 'owner' ? req.body.role : 'editor';
    const u = await db.query('SELECT id, username FROM users WHERE LOWER(username) = LOWER($1) AND is_deleted IS NOT TRUE', [String(req.body.username || '').replace(/^@/, '')]);
    if (!u.rows[0]) return sendError(res, 'No user with that username.', 404, 'NOT_FOUND', req);
    const ins = await db.query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (project_id, user_id) DO NOTHING RETURNING 1`,
      [req.params.id, u.rows[0].id, role]
    );
    if (!ins.rows.length) return sendError(res, `@${u.rows[0].username} is already a member.`, 409, 'CONFLICT_ERROR', req);
    const p = await db.query('SELECT name FROM projects WHERE id = $1', [req.params.id]);
    await notify({ userId: u.rows[0].id, actorId: req.user.id, type: 'project_invite', entityType: 'project', entityId: req.params.id, message: p.rows[0]?.name });
    return sendSuccess(res, { username: u.rows[0].username, role }, `@${u.rows[0].username} added.`, 201);
  } catch (error) {
    next(error);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const myRole = await requireAccess(req, res, req.params.id);
    if (!myRole) return;
    if (!isUuid(req.params.userId)) return sendError(res, 'Member not found.', 404, 'NOT_FOUND', req);
    const leavingSelf = req.params.userId === req.user.id;
    if (!leavingSelf && myRole !== 'owner') return sendError(res, 'Only the owner can remove members.', 403, 'AUTHORIZATION_ERROR', req);
    if (leavingSelf && myRole === 'owner') return sendError(res, 'The owner cannot leave. Delete the project instead.', 400, 'VALIDATION_ERROR', req);
    await db.query(`DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 AND role <> 'owner'`, [req.params.id, req.params.userId]);
    await db.query('UPDATE tasks SET assigned_to = NULL WHERE project_id = $1 AND assigned_to = $2', [req.params.id, req.params.userId]);
    return sendSuccess(res, {}, leavingSelf ? 'You left the project.' : 'Member removed.');
  } catch (error) {
    next(error);
  }
};

// Documents -------------------------------------------------------------
exports.getDocuments = async (req, res, next) => {
  try {
    if (!(await requireAccess(req, res, req.params.id))) return;
    const r = await db.query(
      `SELECT d.id, COALESCE(d.title, d.file_name) AS title, d.file_url, d.abstract, d.authors, d.doi, d.created_at,
              pd.added_at, u.username AS added_by_username
         FROM project_documents pd JOIN documents d ON d.id = pd.document_id AND d.deleted_at IS NULL
         LEFT JOIN users u ON u.id = pd.added_by
        WHERE pd.project_id = $1 ORDER BY pd.added_at DESC`,
      [req.params.id]
    );
    return sendSuccess(res, r.rows, 'Project documents.');
  } catch (error) {
    next(error);
  }
};

exports.addDocument = async (req, res, next) => {
  try {
    if (!(await requireAccess(req, res, req.params.id, { write: true }))) return;
    const documentId = req.body.document_id;
    if (!isUuid(documentId)) return sendError(res, 'Choose a paper to add.', 400, 'VALIDATION_ERROR', req);
    const { allowed } = await canAccessDocument(req.user.id, documentId);
    if (!allowed) return sendError(res, 'Paper not found.', 404, 'NOT_FOUND', req);
    await db.query('INSERT INTO project_documents (project_id, document_id, added_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [req.params.id, documentId, req.user.id]);
    await db.query('UPDATE projects SET updated_at = NOW() WHERE id = $1', [req.params.id]);
    return sendSuccess(res, { document_id: documentId }, 'Paper added to project.', 201);
  } catch (error) {
    next(error);
  }
};

exports.removeDocument = async (req, res, next) => {
  try {
    if (!(await requireAccess(req, res, req.params.id, { write: true }))) return;
    await db.query('DELETE FROM project_documents WHERE project_id = $1 AND document_id = $2', [req.params.id, req.params.documentId]);
    return sendSuccess(res, {}, 'Paper removed from project.');
  } catch (error) {
    next(error);
  }
};

// Tasks -----------------------------------------------------------------
const TASK_SELECT = `
  SELECT t.*, a.username AS assignee_username, a.full_name AS assignee_name, a.profile_picture_url AS assignee_avatar_url,
         c.username AS creator_username
    FROM tasks t LEFT JOIN users a ON a.id = t.assigned_to LEFT JOIN users c ON c.id = t.created_by
`;

const validateAssignee = async (projectId, assignee) => {
  if (!assignee) return null;
  const r = await db.query(
    `SELECT u.id FROM project_members m JOIN users u ON u.id = m.user_id
      WHERE m.project_id = $1 AND (u.id::text = $2 OR LOWER(u.username) = LOWER($2))`,
    [projectId, String(assignee)]
  );
  if (!r.rows[0]) {
    const e = new Error('The assignee must be a member of this project.');
    e.statusCode = 400; e.code = 'VALIDATION_ERROR';
    throw e;
  }
  return r.rows[0].id;
};

exports.getProjectTasks = async (req, res, next) => {
  try {
    if (!(await requireAccess(req, res, req.params.id))) return;
    const r = await db.query(`${TASK_SELECT} WHERE t.project_id = $1 ORDER BY t.position ASC, t.created_at ASC`, [req.params.id]);
    return sendSuccess(res, r.rows, 'Tasks.');
  } catch (error) {
    next(error);
  }
};

exports.getMyTasks = async (req, res, next) => {
  try {
    const r = await db.query(
      `${TASK_SELECT.replace('SELECT t.*,', 'SELECT t.*, p.name AS project_name,')}
         JOIN projects p ON p.id = t.project_id AND p.deleted_at IS NULL
         JOIN project_members m ON m.project_id = p.id AND m.user_id = $1
        WHERE (t.assigned_to = $1 OR t.assigned_to IS NULL OR $2::boolean)
        ORDER BY t.position ASC, t.created_at ASC LIMIT 500`,
      [req.user.id, req.query.all === 'true']
    );
    return sendSuccess(res, r.rows, 'Your tasks.');
  } catch (error) {
    next(error);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    if (!(await requireAccess(req, res, projectId, { write: true }))) return;
    const title = String(req.body.title || '').trim().slice(0, 255);
    if (!title) return sendError(res, 'Task title is required.', 400, 'VALIDATION_ERROR', req);
    const status = STATUSES.includes(req.body.status) ? req.body.status : 'todo';
    const priority = PRIORITIES.includes(req.body.priority) ? req.body.priority : 'medium';
    const assignee = await validateAssignee(projectId, req.body.assigned_to);
    const due = req.body.due_date ? new Date(req.body.due_date) : null;
    const pos = await db.query('SELECT COALESCE(MAX(position), 0) + 1 AS n FROM tasks WHERE project_id = $1 AND status = $2', [projectId, status]);
    const ins = await db.query(
      `INSERT INTO tasks (project_id, created_by, assigned_to, title, description, status, priority, position, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [projectId, req.user.id, assignee, title, String(req.body.description || '').slice(0, 5000), status, priority, pos.rows[0].n,
        due && !Number.isNaN(due.getTime()) ? due.toISOString() : null]
    );
    await db.query('UPDATE projects SET updated_at = NOW() WHERE id = $1', [projectId]);
    if (assignee && assignee !== req.user.id) {
      await notify({ userId: assignee, actorId: req.user.id, type: 'task_assigned', entityType: 'project', entityId: projectId, message: title });
    }
    const r = await db.query(`${TASK_SELECT} WHERE t.id = $1`, [ins.rows[0].id]);
    return sendSuccess(res, r.rows[0], 'Task created.', 201);
  } catch (error) {
    if (error.statusCode === 400) return sendError(res, error.message, 400, error.code, req);
    next(error);
  }
};

const loadTask = async (taskId) => {
  if (!isUuid(taskId)) return null;
  const r = await db.query('SELECT id, project_id, assigned_to FROM tasks WHERE id = $1', [taskId]);
  return r.rows[0] || null;
};

exports.updateTask = async (req, res, next) => {
  try {
    const task = await loadTask(req.params.taskId || req.body.task_id);
    if (!task) return sendError(res, 'Task not found.', 404, 'NOT_FOUND', req);
    if (!(await requireAccess(req, res, task.project_id, { write: true }))) return;
    const b = req.body || {};
    if (b.status !== undefined && !STATUSES.includes(b.status)) return sendError(res, 'Invalid status.', 400, 'VALIDATION_ERROR', req);
    if (b.priority !== undefined && !PRIORITIES.includes(b.priority)) return sendError(res, 'Invalid priority.', 400, 'VALIDATION_ERROR', req);
    let assignee = task.assigned_to;
    if (b.assigned_to !== undefined) assignee = b.assigned_to ? await validateAssignee(task.project_id, b.assigned_to) : null;
    let due;
    if (b.due_date !== undefined) {
      const d = b.due_date ? new Date(b.due_date) : null;
      due = d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
    }
    await db.query(
      `UPDATE tasks SET status = COALESCE($1, status), position = COALESCE($2, position), title = COALESCE($3, title),
              description = COALESCE($4, description), assigned_to = $5, priority = COALESCE($6, priority),
              due_date = CASE WHEN $7::boolean THEN $8::timestamptz ELSE due_date END, updated_at = NOW()
        WHERE id = $9`,
      [b.status || null, Number.isFinite(b.position) ? b.position : null, b.title ? String(b.title).trim().slice(0, 255) : null,
        b.description !== undefined ? String(b.description).slice(0, 5000) : null, assignee, b.priority || null,
        b.due_date !== undefined, due || null, task.id]
    );
    if (assignee && assignee !== task.assigned_to && assignee !== req.user.id) {
      await notify({ userId: assignee, actorId: req.user.id, type: 'task_assigned', entityType: 'project', entityId: task.project_id, message: b.title || null });
    }
    const r = await db.query(`${TASK_SELECT} WHERE t.id = $1`, [task.id]);
    return sendSuccess(res, r.rows[0], 'Task updated.');
  } catch (error) {
    if (error.statusCode === 400) return sendError(res, error.message, 400, error.code, req);
    next(error);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const task = await loadTask(req.params.taskId);
    if (!task) return sendError(res, 'Task not found.', 404, 'NOT_FOUND', req);
    if (!(await requireAccess(req, res, task.project_id, { write: true }))) return;
    await db.query('DELETE FROM tasks WHERE id = $1', [task.id]);
    return sendSuccess(res, { id: task.id }, 'Task deleted.');
  } catch (error) {
    next(error);
  }
};
