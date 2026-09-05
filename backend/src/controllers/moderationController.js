const db = require('../config/db');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');

// Report Content (Section 45 / 46)
exports.createReport = async (req, res, next) => {
  const { post_id, resource_type, resource_id, reason, description, details } = req.body;
  const reporter_id = req.user.id;
  const targetPostId = post_id || resource_id;

  if (!targetPostId || !reason) {
    return sendError(res, 'post_id and reason are required', 400, 'VALIDATION_ERROR', req);
  }

  try {
    // 1. Post check query
    const postCheck = await db.query('SELECT id FROM posts WHERE id = $1', [targetPostId]);
    if (!postCheck || !postCheck.rows || postCheck.rows.length === 0) {
      return sendError(res, 'Post not found', 404, 'NOT_FOUND', req);
    }

    const reportDetails = description || details || '';

    // 2. Insert report query
    const newReport = await db.query(
      `INSERT INTO content_reports (reporter_id, post_id, reason, details)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [reporter_id, targetPostId, reason, reportDetails]
    );

    logger.info(`AUDIT: Report submitted by user ${reporter_id} for post ${targetPostId}. Reason: ${reason}`);
    return sendSuccess(res, newReport.rows[0], 'Report submitted successfully.', 201);
  } catch (error) {
    next(error);
  }
};

// List Reports (Admin/Moderator Only)
exports.listReports = async (req, res, next) => {
  try {
    const reports = await db.query(`
      SELECT cr.*, u.username as reporter_username, p.caption as post_caption, p.author_id as post_author_id, pu.username as post_author_username
      FROM content_reports cr
      LEFT JOIN users u ON cr.reporter_id = u.id
      LEFT JOIN posts p ON cr.post_id = p.id
      LEFT JOIN users pu ON p.author_id = pu.id
      ORDER BY cr.created_at DESC
    `);
    return sendSuccess(res, reports.rows, 'Reports list retrieved.');
  } catch (error) {
    next(error);
  }
};

// Resolve Report (Admin/Moderator Only)
exports.resolveReport = async (req, res, next) => {
  const { id } = req.params;
  const { action } = req.body;

  if (!action || !['delete_post', 'delete', 'dismiss'].includes(action)) {
    return sendError(res, 'Invalid action. Must be delete_post or dismiss', 400, 'VALIDATION_ERROR', req);
  }

  try {
    const reportRes = await db.query('SELECT * FROM content_reports WHERE id = $1', [id]);
    if (!reportRes || !reportRes.rows || reportRes.rows.length === 0) {
      return sendError(res, 'Report not found', 404, 'NOT_FOUND', req);
    }

    const report = reportRes.rows[0];

    if (action === 'delete_post' || action === 'delete') {
      await db.query('DELETE FROM posts WHERE id = $1', [report.post_id]);
      await db.query('UPDATE content_reports SET status = $1 WHERE id = $2', ['resolved', id]);
    } else {
      await db.query('UPDATE content_reports SET status = $1 WHERE id = $2', ['dismissed', id]);
    }

    logger.info(`AUDIT: Report ${id} resolved by moderator ${req.user.id}. Action: ${action}`);
    return sendSuccess(res, {}, `Report handled with action: ${action}`);
  } catch (error) {
    next(error);
  }
};

// List Users for Verification (Admin/Moderator Only)
exports.listUsers = async (req, res, next) => {
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
    return sendSuccess(res, users.rows, 'Users list fetched.');
  } catch (error) {
    next(error);
  }
};

// Update User Verification & Role (Section 45)
exports.verifyUser = async (req, res, next) => {
  const { id } = req.params;
  const { status, role } = req.body;

  try {
    if (role === 'admin' && req.user.role !== 'admin') {
      return sendError(res, 'Forbidden: Only full administrators can assign the admin role.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [id]);
    if (!userCheck || !userCheck.rows || userCheck.rows.length === 0) {
      return sendError(res, 'User not found', 404, 'NOT_FOUND', req);
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
      return sendError(res, 'No fields to update', 400, 'VALIDATION_ERROR', req);
    }

    params.push(id);
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, verification_status, role`;

    const updatedUser = await db.query(query, params);

    logger.info(`AUDIT: User ${id} updated by moderator ${req.user.id}. Status: ${status}, Role: ${role}`);
    return sendSuccess(res, updatedUser.rows[0], 'User verification/role updated.');
  } catch (error) {
    next(error);
  }
};
