const db = require('../config/db');

// List All Projects (Section 4.3)
exports.getProjects = async (req, res) => {
  const userId = req.user.id;
  try {
    const list = await db.query('SELECT * FROM projects WHERE creator_id = $1 OR members @> $2', [userId, JSON.stringify([userId])]);
    res.status(200).json({ success: true, data: list.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Projects fetch failed' });
  }
};

// Kanban Board Actions (Section 4.3.1)
exports.getProjectTasks = async (req, res) => {
  const { project_id } = req.params;
  const userId = req.user.id;
  try {
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND (creator_id = $2 OR members @> $3)',
      [project_id, userId, JSON.stringify([userId])]
    );
    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Forbidden: Not authorized to access this project' });
    }

    const tasks = await db.query('SELECT * FROM tasks WHERE project_id = $1 ORDER BY position ASC', [project_id]);
    res.status(200).json({ success: true, data: tasks.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Tasks fetch failed' });
  }
};

exports.updateTask = async (req, res) => {
  const { task_id, status, position } = req.body;
  const userId = req.user.id;
  try {
    const taskCheck = await db.query(
      `SELECT t.id FROM tasks t 
       JOIN projects p ON t.project_id = p.id 
       WHERE t.id = $1 AND (p.creator_id = $2 OR p.members @> $3)`,
      [task_id, userId, JSON.stringify([userId])]
    );
    if (taskCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cannot modify task for this project' });
    }

    await db.query('UPDATE tasks SET status = $1, position = $2, updated_at = NOW() WHERE id = $3', [status, position, task_id]);
    res.status(200).json({ success: true, message: 'Task updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

// Version Control Actions (Section 4.3.2)
exports.getDocumentVersions = async (req, res) => {
  const { document_id } = req.params;
  const userId = req.user.id;
  try {
    const docCheck = await db.query('SELECT id FROM documents WHERE id = $1 AND uploader_id = $2', [document_id, userId]);
    if (docCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cannot access document versions' });
    }

    const versions = await db.query('SELECT * FROM document_versions WHERE document_id = $1 ORDER BY version_number DESC', [document_id]);
    res.status(200).json({ success: true, data: versions.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Versions fetch failed' });
  }
};

exports.createVersion = async (req, res) => {
  const { document_id, content, comment } = req.body;
  const author_id = req.user.id;
  try {
    const docCheck = await db.query('SELECT id FROM documents WHERE id = $1 AND uploader_id = $2', [document_id, author_id]);
    if (docCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cannot create version for this document' });
    }

    const newVersion = await db.query(
      `INSERT INTO document_versions (document_id, content_snapshot, author_id, comment) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [document_id, content, author_id, comment]
    );
    res.status(201).json({ success: true, data: newVersion.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Version creation failed' });
  }
};

// Co-Authorship Tracking (Section 4.3.3)
exports.getAuthorshipMetrics = async (req, res) => {
  const { document_id } = req.params;
  const userId = req.user.id;
  try {
    const docCheck = await db.query('SELECT id FROM documents WHERE id = $1 AND uploader_id = $2', [document_id, userId]);
    if (docCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cannot access authorship metrics' });
    }

    const metrics = [
      { name: "Dr. Julia Newton", edits: 142, comments: 24, percent: 65 },
      { name: "Me", edits: 45, comments: 12, percent: 35 }
    ];
    res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Metrics failed' });
  }
};

