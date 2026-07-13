const db = require('../config/db');
const logger = require('../utils/logger');

// Report a Post
exports.createReport = async (req, res) => {
  const { post_id, reason, details } = req.body;
  const reporter_id = req.user.id;

  if (!post_id || !reason) {
    return res.status(400).json({ success: false, message: 'post_id and reason are required' });
  }

  try {
    // Check if post exists
    const postCheck = await db.query('SELECT id FROM posts WHERE id = $1', [post_id]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const newReport = await db.query(
      'INSERT INTO content_reports (reporter_id, post_id, reason, details) VALUES ($1, $2, $3, $4) RETURNING *',
      [reporter_id, post_id, reason, details]
    );

    logger.info(`AUDIT: Report submitted by user ${reporter_id} for post ${post_id}. Reason: ${reason}`);

    res.status(201).json({ success: true, data: newReport.rows[0] });
  } catch (error) {
    console.error('Create Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit report' });
  }
};

// List Reports (Admin/Moderator Only)
exports.listReports = async (req, res) => {
  try {
    const reports = await db.query(`
      SELECT cr.*, u.username as reporter_username, p.caption as post_caption, p.author_id as post_author_id, pu.username as post_author_username
      FROM content_reports cr
      LEFT JOIN users u ON cr.reporter_id = u.id
      LEFT JOIN posts p ON cr.post_id = p.id
      LEFT JOIN users pu ON p.author_id = pu.id
      ORDER BY cr.created_at DESC
    `);

    res.status(200).json({ success: true, data: reports.rows });
  } catch (error) {
    console.error('List Reports Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

// Resolve Report (Admin/Moderator Only)
exports.resolveReport = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'delete_post' or 'dismiss'

  if (!action || !['delete_post', 'dismiss'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action. Must be delete_post or dismiss' });
  }

  try {
    const reportRes = await db.query('SELECT * FROM content_reports WHERE id = $1', [id]);
    if (reportRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const report = reportRes.rows[0];

    if (action === 'delete_post') {
      await db.query('DELETE FROM posts WHERE id = $1', [report.post_id]);
      await db.query('UPDATE content_reports SET status = $1 WHERE id = $2', ['resolved', id]);
    } else {
      await db.query('UPDATE content_reports SET status = $1 WHERE id = $2', ['dismissed', id]);
    }

    logger.info(`AUDIT: Report ${id} resolved by moderator ${req.user.id}. Action: ${action}, post_id: ${report.post_id}`);

    res.status(200).json({ success: true, message: `Report handled with action: ${action}` });
  } catch (error) {
    console.error('Resolve Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve report' });
  }
};

// List Users for Verification (Admin/Moderator Only)
exports.listUsers = async (req, res) => {
  const { verification_status } = req.query;
  try {
    let query = 'SELECT id, email, username, full_name, verification_status, role, orcid_id, created_at FROM users';
    const params = [];

    if (verification_status) {
      query += ' WHERE verification_status = $1';
      params.push(verification_status);
    }

    query += ' ORDER BY created_at DESC';

    const users = await db.query(query, params);
    res.status(200).json({ success: true, data: users.rows });
  } catch (error) {
    console.error('List Users Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// Update User Verification Status (Admin/Moderator Only)
exports.verifyUser = async (req, res) => {
  const { id } = req.params;
  const { status, role } = req.body; // e.g. status: 'verified', 'scholar', 'student', 'unverified'

  try {
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let updateFields = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      updateFields.push(`verification_status = $${paramIndex++}`);
      params.push(status);
    }
    if (role) {
      updateFields.push(`role = $${paramIndex++}`);
      params.push(role);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    params.push(id);
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, verification_status, role`;

    const updatedUser = await db.query(query, params);

    logger.info(`AUDIT: User ${id} updated by moderator ${req.user.id}. Status: ${status}, Role: ${role}`);

    res.status(200).json({ success: true, data: updatedUser.rows[0] });
  } catch (error) {
    console.error('Verify User Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};
