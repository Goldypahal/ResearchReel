const db = require('../config/db');

// List All Projects (Section 4.3)
exports.getProjects = async (req, res) => {
  const { user_id } = req.query;
  try {
    const list = await db.query('SELECT * FROM projects WHERE creator_id = $1 OR members @> $2', [user_id, JSON.stringify([user_id])]);
    res.status(200).json({ success: true, data: list.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Projects fetch failed' });
  }
};

// Kanban Board Actions (Section 4.3.1)
exports.getProjectTasks = async (req, res) => {
  const { project_id } = req.params;
  try {
    const tasks = await db.query('SELECT * FROM tasks WHERE project_id = $1 ORDER BY position ASC', [project_id]);
    res.status(200).json({ success: true, data: tasks.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Tasks fetch failed' });
  }
};

exports.updateTask = async (req, res) => {
  const { task_id, status, position } = req.body;
  try {
    await db.query('UPDATE tasks SET status = $1, position = $2, updated_at = NOW() WHERE id = $3', [status, position, task_id]);
    res.status(200).json({ success: true, message: 'Task updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

// Version Control Actions (Section 4.3.2)
exports.getDocumentVersions = async (req, res) => {
  const { document_id } = req.params;
  try {
    const versions = await db.query('SELECT * FROM document_versions WHERE document_id = $1 ORDER BY version_number DESC', [document_id]);
    res.status(200).json({ success: true, data: versions.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Versions fetch failed' });
  }
};

exports.createVersion = async (req, res) => {
  const { document_id, content, author_id, comment } = req.body;
  try {
    // 1. Snapshot current content (Placeholders)
    // 2. Identify diffs from previous version (Placeholders)
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
  try {
    // Mocking contributor metrics based on edits & comments
    const metrics = [
      { name: "Dr. Julia Newton", edits: 142, comments: 24, percent: 65 },
      { name: "Me", edits: 45, comments: 12, percent: 35 }
    ];
    res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Metrics failed' });
  }
};
