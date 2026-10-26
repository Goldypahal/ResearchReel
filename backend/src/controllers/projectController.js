const projectRepository = require('../repositories/projectRepository');
const pool = require('../config/db');
const { canAccessProject } = require('../authorization/projectAuthorization');
const { canAccessDocument } = require('../authorization/documentAuthorization');
const { sendSuccess, sendError } = require('../utils/response');
const { isUuid, RANK } = require('./projectCollabController');

const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const isMember = async (projectId, userId) =>
  (await pool.query('SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId])).rowCount > 0;

/** Shared validation for task create/update. Returns an error message or null. */
const validateTask = async (projectId, { status, priority, assigned_to, title, due_date }, creating) => {
  if (creating && (!title || !String(title).trim())) return 'Task title is required.';
  if (title !== undefined && String(title).length > 300) return 'Task titles are limited to 300 characters.';
  if (status !== undefined && !TASK_STATUSES.includes(status)) return `status must be one of ${TASK_STATUSES.join(', ')}.`;
  if (priority !== undefined && !TASK_PRIORITIES.includes(priority)) return `priority must be one of ${TASK_PRIORITIES.join(', ')}.`;
  if (due_date !== undefined && due_date !== null && due_date !== '' && Number.isNaN(Date.parse(due_date))) return 'due_date must be a date.';
  if (assigned_to) {
    if (!isUuid(assigned_to) || !(await isMember(projectId, assigned_to))) return 'Tasks can only be assigned to project members.';
  }
  return null;
};

// Get User Projects (Section 21 / 22)
exports.getProjects = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projects = await projectRepository.findUserProjects(userId);
    return sendSuccess(res, projects, 'User projects retrieved.');
  } catch (error) {
    next(error);
  }
};

// Create Project (Section 22 & 51 - Transactional creation with owner membership)
exports.createProject = async (req, res, next) => {
  try {
    const { name, description, research_field, visibility } = req.body;
    const creatorId = req.user.id;

    if (!name || name.trim().length === 0) {
      return sendError(res, 'Project name is required.', 400, 'VALIDATION_ERROR', req);
    }

    const project = await projectRepository.createProjectWithOwner({
      creatorId,
      name,
      description,
      researchField: research_field,
      visibility
    });

    return sendSuccess(res, project, 'Project created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

// Get Single Project Details
exports.getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allowed, role } = await canAccessProject(req.user.id, id);
    if (!allowed) {
      return sendError(res, 'Forbidden: You do not have access to this project.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const project = await projectRepository.findById(id);
    if (!project) {
      return sendError(res, 'Project not found.', 404, 'NOT_FOUND', req);
    }

    return sendSuccess(res, { ...project, user_role: role }, 'Project details retrieved.');
  } catch (error) {
    next(error);
  }
};

// Delete / Soft Delete Project
exports.deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allowed, role } = await canAccessProject(req.user.id, id);
    if (!allowed || role !== 'owner') {
      return sendError(res, 'Only project owner can delete this project.', 403, 'AUTHORIZATION_ERROR', req);
    }

    await projectRepository.softDelete(id);
    return sendSuccess(res, { id }, 'Project soft-deleted successfully.');
  } catch (error) {
    next(error);
  }
};

// Project Tasks (Section 24 / 25)
exports.getProjectTasks = async (req, res, next) => {
  const { id, project_id } = req.params;
  const targetProjectId = id || project_id;
  const userId = req.user.id;

  try {
    const { allowed } = await canAccessProject(userId, targetProjectId);
    if (!allowed) {
      return sendError(res, 'Forbidden: Not authorized to access this project.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const tasks = await pool.query(
      'SELECT * FROM tasks WHERE project_id = $1 ORDER BY position ASC, created_at DESC',
      [targetProjectId]
    );
    return sendSuccess(res, tasks.rows, 'Project tasks retrieved.');
  } catch (error) {
    next(error);
  }
};

// Create Task (Section 24)
exports.createTask = async (req, res, next) => {
  const { id, project_id } = req.params;
  const targetProjectId = id || project_id || req.body.project_id;
  const { title, description, assigned_to, priority, due_date } = req.body || {};
  const userId = req.user.id;

  try {
    if (!isUuid(targetProjectId)) return sendError(res, 'Project not found.', 404, 'NOT_FOUND', req);
    const { allowed, role } = await canAccessProject(userId, targetProjectId);
    if (!allowed) {
      return sendError(res, 'Forbidden: Cannot create task for this project.', 403, 'AUTHORIZATION_ERROR', req);
    }
    if ((RANK[role] || 0) < RANK.editor) return sendError(res, "Viewers can't add tasks.", 403, 'AUTHORIZATION_ERROR', req);
    const invalid = await validateTask(targetProjectId, req.body || {}, true);
    if (invalid) return sendError(res, invalid, 400, 'VALIDATION_ERROR', req);

    const taskRes = await pool.query(`
      INSERT INTO tasks (project_id, created_by, assigned_to, title, description, status, priority, due_date)
      VALUES ($1, $2, $3, $4, $5, 'todo', $6, $7)
      RETURNING *;
    `, [targetProjectId, userId, assigned_to || null, String(title).trim(), String(description || '').slice(0, 5000), priority || 'medium', due_date || null]);

    return sendSuccess(res, taskRes.rows[0], 'Task created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

// Update Task (Section 25 - Must check project authorization before modifying tasks)
exports.updateTask = async (req, res, next) => {
  const taskId = req.params.taskId || req.body.task_id;
  const { status, position, title, description, assigned_to, priority, due_date } = req.body || {};
  const userId = req.user.id;

  try {
    if (!isUuid(taskId)) return sendError(res, 'Task not found.', 404, 'NOT_FOUND', req);
    // Section 25 verification: find task -> find project -> verify project membership
    const taskCheck = await pool.query('SELECT id, project_id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheck.rows.length === 0) {
      return sendError(res, 'Task not found.', 404, 'NOT_FOUND', req);
    }

    const projectId = taskCheck.rows[0].project_id;
    const { allowed, role } = await canAccessProject(userId, projectId);
    if (!allowed) {
      return sendError(res, 'Forbidden: Cannot modify tasks for this project.', 403, 'AUTHORIZATION_ERROR', req);
    }
    if ((RANK[role] || 0) < RANK.editor) return sendError(res, "Viewers can't change tasks.", 403, 'AUTHORIZATION_ERROR', req);
    const invalid = await validateTask(projectId, req.body || {}, false);
    if (invalid) return sendError(res, invalid, 400, 'VALIDATION_ERROR', req);

    // assigned_to: undefined = keep, null/'' = unassign.
    const updatedTask = await pool.query(`
      UPDATE tasks
      SET status = COALESCE($1, status),
          position = COALESCE($2, position),
          title = COALESCE($3, title),
          description = COALESCE($4, description),
          assigned_to = CASE WHEN $8::boolean THEN $5::uuid ELSE assigned_to END,
          priority = COALESCE($6, priority),
          due_date = CASE WHEN $9::boolean THEN $10::timestamptz ELSE due_date END,
          updated_at = NOW()
      WHERE id = $7
      RETURNING *;
    `, [status ?? null, Number.isFinite(position) ? position : null, title !== undefined ? String(title).trim() : null, description ?? null,
      assigned_to || null, priority ?? null, taskId, assigned_to !== undefined, due_date !== undefined, due_date || null]);

    return sendSuccess(res, updatedTask.rows[0], 'Task updated successfully.');
  } catch (error) {
    next(error);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    if (!isUuid(req.params.taskId)) return sendError(res, 'Task not found.', 404, 'NOT_FOUND', req);
    const t = await pool.query('SELECT project_id FROM tasks WHERE id = $1', [req.params.taskId]);
    if (!t.rows[0]) return sendError(res, 'Task not found.', 404, 'NOT_FOUND', req);
    const { allowed, role } = await canAccessProject(req.user.id, t.rows[0].project_id);
    if (!allowed || (RANK[role] || 0) < RANK.editor) return sendError(res, "You can't delete tasks in this project.", 403, 'AUTHORIZATION_ERROR', req);
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.taskId]);
    return sendSuccess(res, { id: req.params.taskId }, 'Task deleted.');
  } catch (error) {
    next(error);
  }
};

// Document Version Actions (Section 15)
exports.getDocumentVersions = async (req, res, next) => {
  const { document_id } = req.params;
  const userId = req.user.id;

  try {
    const { allowed } = await canAccessDocument(userId, document_id);
    if (!allowed) {
      return sendError(res, 'Forbidden: Cannot access document versions.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const versions = await pool.query(
      'SELECT * FROM document_versions WHERE document_id = $1 ORDER BY version_number DESC',
      [document_id]
    );
    return sendSuccess(res, versions.rows, 'Document versions retrieved.');
  } catch (error) {
    next(error);
  }
};

exports.createVersion = async (req, res, next) => {
  const { document_id, content, change_summary } = req.body;
  const author_id = req.user.id; // Section 15: author_id MUST come from req.user.id

  try {
    const { allowed, permission } = await canAccessDocument(author_id, document_id);
    if (!allowed || permission === 'viewer') {
      return sendError(res, 'Forbidden: Edit permissions required to create document version.', 403, 'AUTHORIZATION_ERROR', req);
    }

    // Get current latest version
    const versionRes = await pool.query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 as next_ver FROM document_versions WHERE document_id = $1',
      [document_id]
    );
    const nextVersion = versionRes.rows[0].next_ver;

    const newVersion = await pool.query(
      `INSERT INTO document_versions (document_id, author_id, version_number, content, change_summary) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [document_id, author_id, nextVersion, content || '', change_summary || 'Manual save']
    );

    return sendSuccess(res, newVersion.rows[0], 'Document version created.', 201);
  } catch (error) {
    next(error);
  }
};
