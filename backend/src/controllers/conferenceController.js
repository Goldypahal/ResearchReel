const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
const { isUuid } = require('../utils/pagination');

const SELECT = `
  SELECT c.*, u.username AS created_by_username,
         (SELECT COUNT(*)::int FROM conference_follows f WHERE f.conference_id = c.id) AS follower_count,
         CASE WHEN $1::uuid IS NULL THEN FALSE
              ELSE EXISTS (SELECT 1 FROM conference_follows f WHERE f.conference_id = c.id AND f.user_id = $1::uuid) END AS is_following
    FROM conferences c LEFT JOIN users u ON u.id = c.created_by
`;

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
};

exports.list = async (req, res, next) => {
  try {
    const params = [req.user?.id || null];
    const where = [];
    if (req.query.scope === 'following' && req.user) where.push('EXISTS (SELECT 1 FROM conference_follows f WHERE f.conference_id = c.id AND f.user_id = $1::uuid)');
    if (req.query.past !== 'true') where.push('(COALESCE(c.end_date, c.start_date, c.submission_deadline) IS NULL OR COALESCE(c.end_date, c.start_date, c.submission_deadline) >= CURRENT_DATE)');
    if (req.query.q) { params.push(`%${String(req.query.q).slice(0, 100)}%`); where.push(`(c.name ILIKE $${params.length} OR c.acronym ILIKE $${params.length} OR c.field ILIKE $${params.length})`); }
    const r = await db.query(
      `${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY COALESCE(c.submission_deadline, c.start_date) ASC NULLS LAST LIMIT 200`,
      params
    );
    return sendSuccess(res, r.rows, 'Conferences.');
  } catch (error) {
    next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Conference not found.', 404, 'NOT_FOUND', req);
    const r = await db.query(`${SELECT} WHERE c.id = $2`, [req.user?.id || null, req.params.id]);
    if (!r.rows[0]) return sendError(res, 'Conference not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, r.rows[0], 'Conference.');
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const b = req.body || {};
    const name = String(b.name || '').trim().slice(0, 255);
    if (!name) return sendError(res, 'Conference name is required.', 400, 'VALIDATION_ERROR', req);
    const dates = { start: toDate(b.start_date), end: toDate(b.end_date), deadline: toDate(b.submission_deadline) };
    if (Object.values(dates).includes(undefined)) return sendError(res, 'One of the dates is invalid.', 400, 'VALIDATION_ERROR', req);
    if (dates.start && dates.end && dates.end < dates.start) return sendError(res, 'End date must be after the start date.', 400, 'VALIDATION_ERROR', req);
    const website = b.website_url ? String(b.website_url).trim() : null;
    if (website && !/^https?:\/\/\S+$/i.test(website)) return sendError(res, 'Website must start with http:// or https://', 400, 'VALIDATION_ERROR', req);
    const r = await db.query(
      `INSERT INTO conferences (created_by, name, acronym, description, field, location, start_date, end_date, submission_deadline, website_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [req.user.id, name, String(b.acronym || '').trim().slice(0, 40) || null, String(b.description || '').slice(0, 3000) || null,
        String(b.field || '').trim().slice(0, 120) || null, String(b.location || '').trim().slice(0, 255) || null,
        dates.start, dates.end, dates.deadline, website ? website.slice(0, 500) : null]
    );
    await db.query('INSERT INTO conference_follows (conference_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [r.rows[0].id, req.user.id]);
    const out = await db.query(`${SELECT} WHERE c.id = $2`, [req.user.id, r.rows[0].id]);
    return sendSuccess(res, out.rows[0], 'Conference added.', 201);
  } catch (error) {
    next(error);
  }
};

exports.follow = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Conference not found.', 404, 'NOT_FOUND', req);
    const r = await db.query('INSERT INTO conference_follows (conference_id, user_id) SELECT id, $2 FROM conferences WHERE id = $1 ON CONFLICT DO NOTHING RETURNING 1', [req.params.id, req.user.id]);
    return sendSuccess(res, { is_following: true, changed: r.rows.length > 0 }, 'Tracking this conference.');
  } catch (error) {
    next(error);
  }
};

exports.unfollow = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Conference not found.', 404, 'NOT_FOUND', req);
    await db.query('DELETE FROM conference_follows WHERE conference_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    return sendSuccess(res, { is_following: false }, 'Stopped tracking.');
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Conference not found.', 404, 'NOT_FOUND', req);
    const isStaff = ['admin', 'moderator'].includes(req.user.role);
    const r = await db.query('DELETE FROM conferences WHERE id = $1 AND (created_by = $2 OR $3::boolean) RETURNING id', [req.params.id, req.user.id, isStaff]);
    if (!r.rows.length) return sendError(res, 'Conference not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, { id: req.params.id }, 'Conference removed.');
  } catch (error) {
    next(error);
  }
};
