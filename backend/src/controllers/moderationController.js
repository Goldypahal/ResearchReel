const db = require('../config/db');
const logger = require('../utils/logger');
const sessionRepository = require('../repositories/sessionRepository');
const { notify } = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/response');
const { isUuid } = require('../utils/pagination');

const REASONS = ['spam', 'harassment', 'misinformation', 'plagiarism', 'inappropriate', 'copyright', 'other'];
const VERIFICATION = ['unverified', 'verified', 'student', 'scholar', 'faculty'];
const ROLE_VALUES = ['user', 'moderator', 'admin'];

const audit = (req, action, targetType, targetId, metadata) => db.query(
  'INSERT INTO audit_logs (actor_id, action, target_type, target_id, ip_address, metadata) VALUES ($1, $2, $3, $4, $5, $6)',
  [req.user.id, action, targetType, isUuid(targetId) ? targetId : null, req.ip ? String(req.ip).slice(0, 45) : null, metadata ? JSON.stringify(metadata) : null]
).catch((e) => logger.error(`[audit] ${e.message}`));

exports.createReport = async (req, res, next) => {
  try {
    const postId = req.body.post_id || (req.body.resource_type === 'post' ? req.body.resource_id : null);
    const videoId = req.body.video_id || (req.body.resource_type === 'reel' ? req.body.resource_id : null);
    const reason = REASONS.includes(req.body.reason) ? req.body.reason : (req.body.reason ? 'other' : null);
    const details = String(req.body.details || req.body.description || req.body.reason || '').slice(0, 2000);
    if (!reason) return sendError(res, 'Choose a reason for the report.', 400, 'VALIDATION_ERROR', req);
    if (!isUuid(postId) && !isUuid(videoId)) return sendError(res, 'Nothing to report.', 400, 'VALIDATION_ERROR', req);

    if (postId) {
      const p = await db.query('SELECT 1 FROM posts WHERE id = $1 AND deleted_at IS NULL', [postId]);
      if (!p.rows.length) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    } else {
      const v = await db.query('SELECT 1 FROM videos WHERE id = $1 AND deleted_at IS NULL', [videoId]);
      if (!v.rows.length) return sendError(res, 'Reel not found.', 404, 'NOT_FOUND', req);
    }
    const dup = await db.query(
      `SELECT 1 FROM content_reports WHERE reporter_id = $1 AND status = 'pending' AND (post_id = $2 OR video_id = $3)`,
      [req.user.id, postId || null, videoId || null]
    );
    if (dup.rows.length) return sendSuccess(res, {}, 'You already reported this. Our moderators will review it.');

    await db.query(
      `INSERT INTO content_reports (reporter_id, post_id, video_id, reason, details) VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, postId || null, videoId || null, reason, details]
    );
    return sendSuccess(res, {}, 'Thanks — our moderators will review this.', 201);
  } catch (error) {
    next(error);
  }
};

exports.listReports = async (req, res, next) => {
  try {
    const status = ['pending', 'resolved', 'dismissed'].includes(req.query.status) ? req.query.status : 'pending';
    const r = await db.query(
      `SELECT cr.id, cr.reason, cr.details, cr.status, cr.created_at, cr.post_id, cr.video_id,
              ru.username AS reporter_username,
              COALESCE(p.caption, v.title) AS content_preview,
              COALESCE(p.media_urls[1], v.thumbnail_url) AS content_media,
              COALESCE(pa.username, va.username) AS author_username,
              COALESCE(pa.id, va.id) AS author_id,
              (COALESCE(p.deleted_at, v.deleted_at) IS NOT NULL) AS content_removed
         FROM content_reports cr
         LEFT JOIN users ru ON ru.id = cr.reporter_id
         LEFT JOIN posts p ON p.id = cr.post_id
         LEFT JOIN users pa ON pa.id = p.author_id
         LEFT JOIN videos v ON v.id = cr.video_id
         LEFT JOIN users va ON va.id = v.author_id
        WHERE cr.status = $1
        ORDER BY cr.created_at DESC LIMIT 200`,
      [status]
    );
    return sendSuccess(res, r.rows, 'Reports.');
  } catch (error) {
    next(error);
  }
};

exports.resolveReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const action = { delete_post: 'remove', delete: 'remove', remove: 'remove', dismiss: 'dismiss' }[req.body.action];
    if (!isUuid(id) || !action) return sendError(res, 'Choose remove or dismiss.', 400, 'VALIDATION_ERROR', req);
    const rep = await db.query('SELECT * FROM content_reports WHERE id = $1', [id]);
    const report = rep.rows[0];
    if (!report) return sendError(res, 'Report not found.', 404, 'NOT_FOUND', req);

    if (action === 'remove') {
      let authorId = null;
      if (report.post_id) {
        const p = await db.query('UPDATE posts SET deleted_at = NOW() WHERE id = $1 RETURNING author_id', [report.post_id]);
        authorId = p.rows[0]?.author_id;
      }
      if (report.video_id) {
        const v = await db.query('UPDATE videos SET deleted_at = NOW() WHERE id = $1 RETURNING author_id', [report.video_id]);
        authorId = v.rows[0]?.author_id;
      }
      // Resolve every pending report about the same content.
      await db.query(
        `UPDATE content_reports SET status = 'resolved' WHERE status = 'pending' AND ((post_id IS NOT NULL AND post_id = $1) OR (video_id IS NOT NULL AND video_id = $2))`,
        [report.post_id, report.video_id]
      );
      if (authorId) await notify({ userId: authorId, actorId: null, type: 'content_removed', message: `Your content was removed for violating our guidelines (${report.reason}).` });
    } else {
      await db.query(`UPDATE content_reports SET status = 'dismissed' WHERE id = $1`, [id]);
    }
    await audit(req, `report_${action}`, 'content_report', id, { reason: report.reason });
    return sendSuccess(res, {}, action === 'remove' ? 'Content removed.' : 'Report dismissed.');
  } catch (error) {
    next(error);
  }
};

exports.listUsers = async (req, res, next) => {
  try {
    const params = [];
    const where = ['u.is_deleted IS NOT TRUE'];
    if (VERIFICATION.includes(req.query.verification_status)) { params.push(req.query.verification_status); where.push(`u.verification_status = $${params.length}`); }
    if (req.query.q) { params.push(`%${String(req.query.q).slice(0, 100)}%`); where.push(`(u.username ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`); }
    const r = await db.query(
      `SELECT u.id, u.email, u.username, u.full_name, u.verification_status, u.role, u.orcid_id, u.institution,
              u.is_suspended, u.email_verified, u.created_at, u.last_active,
              (SELECT COUNT(*)::int FROM content_reports cr LEFT JOIN posts p ON p.id = cr.post_id LEFT JOIN videos v ON v.id = cr.video_id
                WHERE (p.author_id = u.id OR v.author_id = u.id)) AS report_count
         FROM users u WHERE ${where.join(' AND ')} ORDER BY u.created_at DESC LIMIT 200`,
      params
    );
    return sendSuccess(res, r.rows, 'Users.');
  } catch (error) {
    next(error);
  }
};

exports.verifyUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, role } = req.body;
    if (!isUuid(id)) return sendError(res, 'User not found.', 404, 'NOT_FOUND', req);
    if (status !== undefined && !VERIFICATION.includes(status)) return sendError(res, 'Invalid verification status.', 400, 'VALIDATION_ERROR', req);
    if (role !== undefined && !ROLE_VALUES.includes(role)) return sendError(res, 'Invalid role.', 400, 'VALIDATION_ERROR', req);
    if (role !== undefined && req.user.role !== 'admin') return sendError(res, 'Only administrators can change roles.', 403, 'AUTHORIZATION_ERROR', req);
    if (id === req.user.id && role !== undefined) return sendError(res, 'You cannot change your own role.', 400, 'VALIDATION_ERROR', req);
    const target = await db.query('SELECT role FROM users WHERE id = $1', [id]);
    if (!target.rows[0]) return sendError(res, 'User not found.', 404, 'NOT_FOUND', req);
    if (target.rows[0].role === 'admin' && req.user.role !== 'admin') return sendError(res, 'Moderators cannot modify administrators.', 403, 'AUTHORIZATION_ERROR', req);

    const r = await db.query(
      `UPDATE users SET verification_status = COALESCE($1, verification_status), role = COALESCE($2, role), updated_at = NOW()
        WHERE id = $3 RETURNING id, username, verification_status, role`,
      [status || null, role || null, id]
    );
    await audit(req, 'user_update', 'user', id, { status, role });
    return sendSuccess(res, r.rows[0], 'User updated.');
  } catch (error) {
    next(error);
  }
};

exports.setSuspended = async (req, res, next) => {
  try {
    const { id } = req.params;
    const suspended = Boolean(req.body.suspended);
    if (!isUuid(id) || id === req.user.id) return sendError(res, 'Invalid user.', 400, 'VALIDATION_ERROR', req);
    const target = await db.query('SELECT role FROM users WHERE id = $1', [id]);
    if (!target.rows[0]) return sendError(res, 'User not found.', 404, 'NOT_FOUND', req);
    if (['admin', 'moderator'].includes(target.rows[0].role) && req.user.role !== 'admin') {
      return sendError(res, 'Only administrators can suspend staff.', 403, 'AUTHORIZATION_ERROR', req);
    }
    await db.query('UPDATE users SET is_suspended = $1, updated_at = NOW() WHERE id = $2', [suspended, id]);
    if (suspended) await sessionRepository.revokeAllUserSessions(id);
    await audit(req, suspended ? 'user_suspend' : 'user_unsuspend', 'user', id);
    return sendSuccess(res, { id, is_suspended: suspended }, suspended ? 'User suspended.' : 'User reinstated.');
  } catch (error) {
    next(error);
  }
};

exports.stats = async (req, res, next) => {
  try {
    const r = await db.query(`
      SELECT (SELECT COUNT(*)::int FROM users WHERE is_deleted IS NOT TRUE) AS users,
             (SELECT COUNT(*)::int FROM users WHERE created_at > NOW() - INTERVAL '7 days') AS new_users_7d,
             (SELECT COUNT(*)::int FROM posts WHERE deleted_at IS NULL) AS posts,
             (SELECT COUNT(*)::int FROM videos WHERE deleted_at IS NULL) AS reels,
             (SELECT COUNT(*)::int FROM documents WHERE deleted_at IS NULL) AS papers,
             (SELECT COUNT(*)::int FROM content_reports WHERE status = 'pending') AS pending_reports,
             (SELECT COUNT(*)::int FROM users WHERE is_suspended) AS suspended_users`);
    return sendSuccess(res, r.rows[0], 'Platform stats.');
  } catch (error) {
    next(error);
  }
};

exports.auditLog = async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT a.id, a.action, a.target_type, a.target_id, a.metadata, a.created_at, u.username AS actor_username
         FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.created_at DESC LIMIT 200`
    );
    return sendSuccess(res, r.rows, 'Audit log.');
  } catch (error) {
    next(error);
  }
};
