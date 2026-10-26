const db = require('../config/db');
const notificationService = require('./notificationService');

/** Verification levels allowed to host lectures (admins can always host). */
const HOST_STATUSES = ['scholar', 'faculty'];
const PAGE_SIZE = 20;

const fail = (message, statusCode = 400, code = 'VALIDATION_ERROR') => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
};

const canHost = (user) => Boolean(user) && (user.role === 'admin' || HOST_STATUSES.includes(user.verification_status));

const STATUS_SQL = `CASE
    WHEN l.cancelled_at IS NOT NULL THEN 'cancelled'
    WHEN NOW() < l.starts_at THEN 'upcoming'
    WHEN NOW() < l.starts_at + make_interval(mins => l.duration_minutes) THEN 'live'
    ELSE 'ended' END`;

const SELECT = (viewerParam) => `
  SELECT l.id, l.title, l.description, l.topic, l.tags, l.starts_at, l.duration_minutes, l.capacity,
         l.join_url, l.recording_url, l.cancelled_at, l.created_at,
         ${STATUS_SQL} AS status,
         u.id AS host_id, u.username AS host_username, u.full_name AS host_name,
         COALESCE(u.avatar_url, u.profile_picture_url) AS host_avatar_url,
         u.verification_status AS host_verification_status, u.institution AS host_institution,
         (SELECT COUNT(*)::int FROM lecture_registrations r WHERE r.lecture_id = l.id) AS registered_count,
         ${viewerParam ? `EXISTS (SELECT 1 FROM lecture_registrations r WHERE r.lecture_id = l.id AND r.user_id = ${viewerParam})` : 'FALSE'} AS is_registered
  FROM lectures l
  JOIN users u ON u.id = l.host_id`;

/** The stream link is only for the host and registered attendees. */
const present = (row, viewerId) => {
  const isHost = Boolean(viewerId) && row.host_id === viewerId;
  const { join_url: joinUrl, ...rest } = row;
  return {
    ...rest,
    is_host: isHost,
    join_url: isHost || row.is_registered ? joinUrl : null,
    has_join_url: Boolean(joinUrl),
    is_full: row.capacity != null && row.registered_count >= row.capacity,
  };
};

const httpUrl = (value, field) => {
  if (value == null || value === '') return null;
  let url;
  try {
    url = new URL(String(value).trim());
  } catch {
    throw fail(`${field} must be a valid link.`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw fail(`${field} must start with http:// or https://.`);
  return url.toString();
};

const cleanInput = (input, { partial = false } = {}) => {
  const out = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(input, k);

  if (!partial || has('title')) {
    const title = String(input.title || '').trim();
    if (title.length < 5 || title.length > 200) throw fail('Title must be 5–200 characters.');
    out.title = title;
  }
  if (!partial || has('description')) {
    const description = String(input.description || '').trim();
    if (description.length > 5000) throw fail('Description is limited to 5,000 characters.');
    out.description = description;
  }
  if (!partial || has('topic')) {
    const topic = String(input.topic || '').trim();
    if (!topic || topic.length > 80) throw fail('Choose a topic (up to 80 characters).');
    out.topic = topic;
  }
  if (!partial || has('tags')) {
    const tags = Array.isArray(input.tags) ? input.tags : String(input.tags || '').split(',');
    out.tags = [...new Set(tags.map((t) => String(t).trim()).filter(Boolean).map((t) => t.slice(0, 40)))].slice(0, 8);
  }
  if (!partial || has('starts_at')) {
    const startsAt = new Date(input.starts_at);
    if (Number.isNaN(startsAt.getTime())) throw fail('Choose a valid start date and time.');
    if (startsAt.getTime() < Date.now() - 60 * 1000) throw fail('The start time must be in the future.');
    out.starts_at = startsAt.toISOString();
  }
  if (!partial || has('duration_minutes')) {
    const duration = Number(input.duration_minutes);
    if (!Number.isInteger(duration) || duration < 15 || duration > 480) throw fail('Duration must be between 15 minutes and 8 hours.');
    out.duration_minutes = duration;
  }
  if (!partial || has('capacity')) {
    if (input.capacity === null || input.capacity === '' || input.capacity === undefined) out.capacity = null;
    else {
      const capacity = Number(input.capacity);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) throw fail('Capacity must be a whole number between 1 and 100,000, or empty for unlimited.');
      out.capacity = capacity;
    }
  }
  if (!partial || has('join_url')) out.join_url = httpUrl(input.join_url, 'Join link');
  if (has('recording_url')) out.recording_url = httpUrl(input.recording_url, 'Recording link');
  return out;
};

const getRow = async (id, viewerId) => {
  const res = await db.query(`${SELECT(viewerId ? '$2' : null)} WHERE l.id = $1`, viewerId ? [id, viewerId] : [id]);
  return res.rows[0] || null;
};

const get = async (id, viewerId) => {
  const row = await getRow(id, viewerId);
  if (!row) throw fail('Lecture not found.', 404, 'NOT_FOUND');
  return present(row, viewerId);
};

/**
 * Lists lectures. `when`: upcoming (default, includes live), live, past, mine
 * (hosting or registered). Ordered soonest-first for upcoming, newest-first for past.
 */
const list = async ({ viewerId, when = 'upcoming', topic, q, cursor, limit = PAGE_SIZE }) => {
  const params = [];
  const add = (v) => { params.push(v); return `$${params.length}`; };
  const viewer = viewerId ? add(viewerId) : null;
  const where = [];
  const pastOrder = when === 'past';

  if (when === 'live') where.push(`${STATUS_SQL} = 'live'`);
  else if (when === 'past') where.push(`l.cancelled_at IS NULL AND NOW() >= l.starts_at + make_interval(mins => l.duration_minutes)`);
  else if (when === 'mine') {
    if (!viewer) throw fail('Sign in to see your lectures.', 401, 'AUTHENTICATION_ERROR');
    where.push(`(l.host_id = ${viewer} OR EXISTS (SELECT 1 FROM lecture_registrations r WHERE r.lecture_id = l.id AND r.user_id = ${viewer}))`);
  } else where.push(`l.cancelled_at IS NULL AND NOW() < l.starts_at + make_interval(mins => l.duration_minutes)`);

  if (topic) where.push(`l.topic = ${add(String(topic))}`);
  if (q && String(q).trim()) {
    const term = add(`%${String(q).trim().replace(/[%_]/g, '\\$&')}%`);
    where.push(`(l.title ILIKE ${term} OR l.description ILIKE ${term} OR EXISTS (SELECT 1 FROM unnest(l.tags) t WHERE t ILIKE ${term}))`);
  }
  if (cursor) {
    const at = new Date(cursor);
    if (!Number.isNaN(at.getTime())) where.push(`l.starts_at ${pastOrder ? '<' : '>'} ${add(at.toISOString())}`);
  }
  const size = Math.min(Math.max(Number(limit) || PAGE_SIZE, 1), 50);
  const res = await db.query(
    `${SELECT(viewer)} WHERE ${where.join(' AND ')} ORDER BY l.starts_at ${pastOrder || when === 'mine' ? 'DESC' : 'ASC'} LIMIT ${add(size + 1)}`,
    params
  );
  const rows = res.rows.slice(0, size).map((r) => present(r, viewerId));
  const nextCursor = res.rows.length > size && when !== 'mine' ? rows[rows.length - 1].starts_at.toISOString() : null;
  return { items: rows, nextCursor };
};

/** Topics in use, for the filter bar. */
const topics = async () => {
  const res = await db.query(
    `SELECT topic, COUNT(*)::int AS count FROM lectures WHERE cancelled_at IS NULL GROUP BY topic ORDER BY count DESC, topic LIMIT 20`
  );
  return res.rows;
};

const assertHost = async (lectureId, user) => {
  const res = await db.query('SELECT host_id, cancelled_at FROM lectures WHERE id = $1', [lectureId]);
  const row = res.rows[0];
  if (!row) throw fail('Lecture not found.', 404, 'NOT_FOUND');
  if (row.host_id !== user.id && user.role !== 'admin') throw fail('Only the host can do that.', 403, 'AUTHORIZATION_ERROR');
  return row;
};

/** Reads role/badge from the database: the copy in the access token can be up to 15 minutes old. */
const freshUser = async (user) => {
  const res = await db.query('SELECT id, role, verification_status FROM users WHERE id = $1', [user.id]);
  return res.rows[0] || user;
};

const create = async (tokenUser, input) => {
  const user = await freshUser(tokenUser);
  if (!canHost(user)) {
    throw fail('Hosting lectures is open to verified scholars and faculty. Connect ORCID in Settings → Verification first.', 403, 'AUTHORIZATION_ERROR');
  }
  const data = cleanInput(input);
  const res = await db.query(
    `INSERT INTO lectures (host_id, title, description, topic, tags, starts_at, duration_minutes, capacity, join_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [user.id, data.title, data.description, data.topic, data.tags, data.starts_at, data.duration_minutes, data.capacity, data.join_url]
  );
  return get(res.rows[0].id, user.id);
};

const update = async (user, lectureId, input) => {
  const current = await assertHost(lectureId, user);
  if (current.cancelled_at) throw fail('This lecture was cancelled and can no longer be edited.', 409, 'CONFLICT');
  const data = cleanInput(input, { partial: true });
  const keys = Object.keys(data);
  if (keys.length === 0) return get(lectureId, user.id);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`);
  await db.query(`UPDATE lectures SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1`, [lectureId, ...keys.map((k) => data[k])]);
  return get(lectureId, user.id);
};

/** Cancels a lecture and tells everyone who registered. */
const cancel = async (user, lectureId) => {
  const current = await assertHost(lectureId, user);
  if (current.cancelled_at) return get(lectureId, user.id);
  const res = await db.query(
    `UPDATE lectures SET cancelled_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING title`,
    [lectureId]
  );
  const attendees = await db.query('SELECT user_id FROM lecture_registrations WHERE lecture_id = $1', [lectureId]);
  await Promise.all(
    attendees.rows.map((r) =>
      notificationService.notify({
        userId: r.user_id, actorId: user.id, type: 'lecture_cancelled', entityType: 'lecture', entityId: lectureId,
        message: res.rows[0].title,
      })
    )
  );
  return get(lectureId, user.id);
};

const register = async (userId, lectureId) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    // Lock the lecture row so concurrent registrations can't overshoot capacity.
    const res = await client.query(
      `SELECT l.host_id, l.capacity, l.cancelled_at, l.title,
              NOW() >= l.starts_at + make_interval(mins => l.duration_minutes) AS ended
       FROM lectures l WHERE l.id = $1 FOR UPDATE`,
      [lectureId]
    );
    const lecture = res.rows[0];
    if (!lecture) throw fail('Lecture not found.', 404, 'NOT_FOUND');
    if (lecture.cancelled_at) throw fail('This lecture was cancelled.', 409, 'CONFLICT');
    if (lecture.ended) throw fail('This lecture has already ended.', 409, 'CONFLICT');
    if (lecture.host_id === userId) throw fail("You're hosting this lecture.", 409, 'CONFLICT');
    if (lecture.capacity != null) {
      const count = await client.query('SELECT COUNT(*)::int AS n FROM lecture_registrations WHERE lecture_id = $1', [lectureId]);
      const already = await client.query('SELECT 1 FROM lecture_registrations WHERE lecture_id = $1 AND user_id = $2', [lectureId, userId]);
      if (!already.rows.length && count.rows[0].n >= lecture.capacity) throw fail('This lecture is full.', 409, 'LECTURE_FULL');
    }
    const inserted = await client.query(
      'INSERT INTO lecture_registrations (lecture_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING user_id',
      [lectureId, userId]
    );
    await client.query('COMMIT');
    if (inserted.rows.length) {
      notificationService
        .notify({ userId: lecture.host_id, actorId: userId, type: 'lecture_registration', entityType: 'lecture', entityId: lectureId, message: lecture.title })
        .catch(() => {});
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  return get(lectureId, userId);
};

const unregister = async (userId, lectureId) => {
  await db.query('DELETE FROM lecture_registrations WHERE lecture_id = $1 AND user_id = $2', [lectureId, userId]);
  return get(lectureId, userId);
};

/** Attendees, visible to the host only. */
const attendees = async (user, lectureId) => {
  await assertHost(lectureId, user);
  const res = await db.query(
    `SELECT u.id, u.username, u.full_name, COALESCE(u.avatar_url, u.profile_picture_url) AS avatar_url,
            u.verification_status, u.institution, r.created_at AS registered_at
     FROM lecture_registrations r JOIN users u ON u.id = r.user_id
     WHERE r.lecture_id = $1 ORDER BY r.created_at ASC`,
    [lectureId]
  );
  return res.rows;
};

// ---- Q&A -------------------------------------------------------------------

const listQuestions = async (lectureId, viewer) => {
  const lecture = await getRow(lectureId, viewer?.id);
  if (!lecture) throw fail('Lecture not found.', 404, 'NOT_FOUND');
  const isHost = viewer && (lecture.host_id === viewer.id || viewer.role === 'admin');
  const res = await db.query(
    `SELECT q.id, q.body, q.is_answered, q.is_hidden, q.created_at,
            u.id AS author_id, u.username, u.full_name, COALESCE(u.avatar_url, u.profile_picture_url) AS avatar_url,
            u.verification_status
     FROM lecture_questions q JOIN users u ON u.id = q.author_id
     WHERE q.lecture_id = $1 AND (q.is_hidden = FALSE OR $2::boolean OR q.author_id = $3)
     ORDER BY q.is_answered ASC, q.created_at ASC
     LIMIT 500`,
    [lectureId, Boolean(isHost), viewer?.id || null]
  );
  return res.rows;
};

const ask = async (user, lectureId, body) => {
  const text = String(body || '').trim();
  if (!text) throw fail('Write your question first.');
  if (text.length > 1000) throw fail('Questions are limited to 1,000 characters.');
  const lecture = await getRow(lectureId, user.id);
  if (!lecture) throw fail('Lecture not found.', 404, 'NOT_FOUND');
  if (lecture.status === 'cancelled') throw fail('This lecture was cancelled.', 409, 'CONFLICT');
  if (lecture.host_id !== user.id && !lecture.is_registered) throw fail('Register for the lecture to ask a question.', 403, 'AUTHORIZATION_ERROR');
  const res = await db.query(
    'INSERT INTO lecture_questions (lecture_id, author_id, body) VALUES ($1, $2, $3) RETURNING id',
    [lectureId, user.id, text]
  );
  if (lecture.host_id !== user.id) {
    notificationService
      .notify({ userId: lecture.host_id, actorId: user.id, type: 'lecture_question', entityType: 'lecture', entityId: lectureId, message: text.slice(0, 140) })
      .catch(() => {});
  }
  return (await listQuestions(lectureId, user)).find((q) => q.id === res.rows[0].id);
};

const moderateQuestion = async (user, lectureId, questionId, { is_answered: answered, is_hidden: hidden }) => {
  await assertHost(lectureId, user);
  const sets = [];
  const params = [questionId, lectureId];
  if (typeof answered === 'boolean') { params.push(answered); sets.push(`is_answered = $${params.length}`); }
  if (typeof hidden === 'boolean') { params.push(hidden); sets.push(`is_hidden = $${params.length}`); }
  if (!sets.length) throw fail('Nothing to change.');
  const res = await db.query(`UPDATE lecture_questions SET ${sets.join(', ')} WHERE id = $1 AND lecture_id = $2 RETURNING id`, params);
  if (!res.rows.length) throw fail('Question not found.', 404, 'NOT_FOUND');
};

const deleteQuestion = async (user, lectureId, questionId) => {
  const res = await db.query(
    `DELETE FROM lecture_questions q USING lectures l
     WHERE q.id = $1 AND q.lecture_id = $2 AND l.id = q.lecture_id
       AND (q.author_id = $3 OR l.host_id = $3 OR $4::boolean)
     RETURNING q.id`,
    [questionId, lectureId, user.id, user.role === 'admin']
  );
  if (!res.rows.length) throw fail('Question not found.', 404, 'NOT_FOUND');
};

module.exports = {
  canHost, freshUser, list, get, topics, create, update, cancel, register, unregister, attendees,
  listQuestions, ask, moderateQuestion, deleteQuestion,
};
