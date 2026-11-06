const db = require('../config/db');
const { emitTo } = require('../services/socketService');
const { notify } = require('../services/notificationService');
const { moderateText } = require('../utils/moderator');
const { sendSuccess, sendError } = require('../utils/response');
const { isUuid } = require('../utils/pagination');

const LECTURE_SELECT = `
  SELECT l.*, u.username AS host_username, u.full_name AS host_name, u.profile_picture_url AS host_avatar_url,
         u.institution AS host_institution, u.verification_status AS host_verification_status,
         (SELECT COUNT(*)::int FROM lecture_attendees a WHERE a.lecture_id = l.id) AS attendee_count,
         (SELECT COUNT(*)::int FROM lecture_comments c WHERE c.lecture_id = l.id) AS comment_count,
         CASE WHEN $1::uuid IS NULL THEN FALSE
              ELSE EXISTS (SELECT 1 FROM lecture_attendees a WHERE a.lecture_id = l.id AND a.user_id = $1::uuid) END AS is_attending
    FROM lectures l JOIN users u ON u.id = l.host_id
`;

const safeUrl = (u) => {
  if (!u) return null;
  const s = String(u).trim();
  return /^https:\/\/[^\s]+$/i.test(s) ? s.slice(0, 500) : undefined;
};

exports.list = async (req, res, next) => {
  try {
    const status = ['live', 'scheduled', 'ended'].includes(req.query.status) ? req.query.status : null;
    const params = [req.user?.id || null];
    let where = 'TRUE';
    if (status) { params.push(status); where = `l.status = $2`; }
    if (req.query.host) { params.push(String(req.query.host)); where += ` AND LOWER(u.username) = LOWER($${params.length})`; }
    const r = await db.query(
      `${LECTURE_SELECT} WHERE ${where}
        ORDER BY CASE l.status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
                 CASE WHEN l.status = 'scheduled' THEN l.scheduled_at END ASC NULLS LAST,
                 COALESCE(l.ended_at, l.created_at) DESC
        LIMIT 100`,
      params
    );
    return sendSuccess(res, r.rows, 'Lectures.');
  } catch (error) {
    next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Lecture not found.', 404, 'NOT_FOUND', req);
    const r = await db.query(`${LECTURE_SELECT} WHERE l.id = $2`, [req.user?.id || null, req.params.id]);
    const lecture = r.rows[0];
    if (!lecture) return sendError(res, 'Lecture not found.', 404, 'NOT_FOUND', req);
    const attendees = await db.query(
      `SELECT u.username, u.full_name, u.profile_picture_url AS avatar_url, u.verification_status, a.joined_at
         FROM lecture_attendees a JOIN users u ON u.id = a.user_id WHERE a.lecture_id = $1 ORDER BY a.joined_at ASC LIMIT 200`,
      [lecture.id]
    );
    const comments = await db.query(
      `SELECT c.id, c.content, c.created_at, u.username, u.full_name, u.profile_picture_url AS avatar_url, u.verification_status
         FROM lecture_comments c JOIN users u ON u.id = c.author_id WHERE c.lecture_id = $1 ORDER BY c.created_at ASC LIMIT 500`,
      [lecture.id]
    );
    const isHost = req.user?.id === lecture.host_id;
    // Only attendees and the host see the meeting link.
    const meetingUrl = (isHost || lecture.is_attending) ? lecture.meeting_url : null;
    return sendSuccess(res, { ...lecture, meeting_url: meetingUrl, has_meeting_url: Boolean(lecture.meeting_url), is_host: isHost, attendees: attendees.rows, comments: comments.rows }, 'Lecture.');
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const b = req.body || {};
    const title = String(b.title || '').trim().slice(0, 200);
    if (!title) return sendError(res, 'Give your lecture a title.', 400, 'VALIDATION_ERROR', req);
    const meetingUrl = safeUrl(b.meeting_url);
    if (meetingUrl === undefined) return sendError(res, 'Meeting link must be an https:// URL (Zoom, Meet, Teams, etc.).', 400, 'VALIDATION_ERROR', req);
    let scheduledAt = null;
    if (b.scheduled_at) {
      const d = new Date(b.scheduled_at);
      if (Number.isNaN(d.getTime())) return sendError(res, 'Invalid date/time.', 400, 'VALIDATION_ERROR', req);
      scheduledAt = d.toISOString();
    }
    const startNow = b.start_now === true || b.start_now === 'true';
    const tags = (Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(','))
      .map((t) => String(t).trim().replace(/^#/, '')).filter(Boolean).slice(0, 10);
    const maxAttendees = Math.min(Math.max(parseInt(b.max_attendees, 10) || 200, 2), 5000);
    for (const text of [title, b.description]) {
      if (!moderateText(text).clean) return sendError(res, 'Your lecture was blocked by our spam filter.', 400, 'CONTENT_REJECTED', req);
    }
    const r = await db.query(
      `INSERT INTO lectures (host_id, title, description, topic, tags, format, status, scheduled_at, started_at, max_attendees, meeting_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [req.user.id, title, String(b.description || '').slice(0, 3000), String(b.topic || '').slice(0, 120) || null, tags,
        String(b.format || 'Lecture').slice(0, 60), startNow ? 'live' : 'scheduled', scheduledAt, startNow ? new Date().toISOString() : null,
        maxAttendees, meetingUrl]
    );
    await db.query('INSERT INTO lecture_attendees (lecture_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [r.rows[0].id, req.user.id]);
    const out = await db.query(`${LECTURE_SELECT} WHERE l.id = $2`, [req.user.id, r.rows[0].id]);
    return sendSuccess(res, out.rows[0], startNow ? 'You are live.' : 'Lecture scheduled.', 201);
  } catch (error) {
    next(error);
  }
};

const loadOwned = async (id, userId) => {
  if (!isUuid(id)) return null;
  const r = await db.query('SELECT * FROM lectures WHERE id = $1 AND host_id = $2', [id, userId]);
  return r.rows[0] || null;
};

exports.setStatus = async (req, res, next) => {
  try {
    const lecture = await loadOwned(req.params.id, req.user.id);
    if (!lecture) return sendError(res, 'Lecture not found.', 404, 'NOT_FOUND', req);
    const action = req.body?.action;
    if (action === 'start') {
      if (lecture.status === 'ended') return sendError(res, 'This lecture has ended.', 409, 'CONFLICT_ERROR', req);
      await db.query(`UPDATE lectures SET status = 'live', started_at = COALESCE(started_at, NOW()) WHERE id = $1`, [lecture.id]);
      const attendees = await db.query('SELECT user_id FROM lecture_attendees WHERE lecture_id = $1 AND user_id <> $2', [lecture.id, req.user.id]);
      for (const a of attendees.rows) {
        await notify({ userId: a.user_id, actorId: req.user.id, type: 'lecture_live', entityType: 'lecture', entityId: lecture.id, message: lecture.title });
      }
    } else if (action === 'end') {
      await db.query(`UPDATE lectures SET status = 'ended', ended_at = NOW() WHERE id = $1`, [lecture.id]);
    } else {
      return sendError(res, 'Unknown action.', 400, 'VALIDATION_ERROR', req);
    }
    emitTo(`lecture:${lecture.id}`, 'lecture_status', { id: lecture.id, status: action === 'start' ? 'live' : 'ended' });
    return sendSuccess(res, { id: lecture.id, status: action === 'start' ? 'live' : 'ended' }, action === 'start' ? 'You are live.' : 'Lecture ended.');
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const lecture = await loadOwned(req.params.id, req.user.id);
    if (!lecture) return sendError(res, 'Lecture not found.', 404, 'NOT_FOUND', req);
    await db.query('DELETE FROM lectures WHERE id = $1', [lecture.id]);
    return sendSuccess(res, { id: lecture.id }, 'Lecture deleted.');
  } catch (error) {
    next(error);
  }
};

exports.attend = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Lecture not found.', 404, 'NOT_FOUND', req);
    const r = await db.query('SELECT id, status, max_attendees, host_id, title FROM lectures WHERE id = $1', [req.params.id]);
    const l = r.rows[0];
    if (!l) return sendError(res, 'Lecture not found.', 404, 'NOT_FOUND', req);
    if (l.status === 'ended') return sendError(res, 'This lecture has ended.', 409, 'CONFLICT_ERROR', req);
    const c = await db.query('SELECT COUNT(*)::int AS n FROM lecture_attendees WHERE lecture_id = $1', [l.id]);
    const already = await db.query('SELECT 1 FROM lecture_attendees WHERE lecture_id = $1 AND user_id = $2', [l.id, req.user.id]);
    if (!already.rows.length && c.rows[0].n >= l.max_attendees) return sendError(res, 'This lecture is full.', 409, 'CONFLICT_ERROR', req);
    await db.query('INSERT INTO lecture_attendees (lecture_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [l.id, req.user.id]);
    if (!already.rows.length) await notify({ userId: l.host_id, actorId: req.user.id, type: 'lecture_rsvp', entityType: 'lecture', entityId: l.id, message: l.title });
    return sendSuccess(res, { is_attending: true }, l.status === 'live' ? 'You joined the lecture.' : 'You are registered.');
  } catch (error) {
    next(error);
  }
};

exports.leave = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Lecture not found.', 404, 'NOT_FOUND', req);
    await db.query('DELETE FROM lecture_attendees WHERE lecture_id = $1 AND user_id = $2 AND user_id <> (SELECT host_id FROM lectures WHERE id = $1)', [req.params.id, req.user.id]);
    return sendSuccess(res, { is_attending: false }, 'You left the lecture.');
  } catch (error) {
    next(error);
  }
};

exports.comment = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Lecture not found.', 404, 'NOT_FOUND', req);
    const content = String(req.body?.content || '').trim().slice(0, 1000);
    if (!content) return sendError(res, 'Write a message first.', 400, 'VALIDATION_ERROR', req);
    if (!moderateText(content).clean) return sendError(res, 'Your message was blocked by our spam filter.', 400, 'CONTENT_REJECTED', req);
    const l = await db.query('SELECT id FROM lectures WHERE id = $1', [req.params.id]);
    if (!l.rows[0]) return sendError(res, 'Lecture not found.', 404, 'NOT_FOUND', req);
    const ins = await db.query('INSERT INTO lecture_comments (lecture_id, author_id, content) VALUES ($1, $2, $3) RETURNING id', [req.params.id, req.user.id, content]);
    const r = await db.query(
      `SELECT c.id, c.lecture_id, c.content, c.created_at, u.username, u.full_name, u.profile_picture_url AS avatar_url, u.verification_status
         FROM lecture_comments c JOIN users u ON u.id = c.author_id WHERE c.id = $1`,
      [ins.rows[0].id]
    );
    emitTo(`lecture:${req.params.id}`, 'lecture_comment', r.rows[0]);
    return sendSuccess(res, r.rows[0], 'Sent.', 201);
  } catch (error) {
    next(error);
  }
};
