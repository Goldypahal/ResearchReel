const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
const { parsePage, nextCursorOf, isUuid } = require('../utils/pagination');

exports.list = async (req, res, next) => {
  try {
    const { limit, cursor } = parsePage(req.query, 30, 100);
    const params = [req.user.id, limit];
    let cursorSql = '';
    if (cursor) { params.push(cursor); cursorSql = 'AND n.created_at < $3'; }
    const r = await db.query(
      `SELECT n.id, n.type, n.entity_type, n.entity_id, n.message, n.is_read, n.created_at,
              a.username AS actor_username, a.full_name AS actor_full_name, a.profile_picture_url AS actor_avatar_url,
              CASE WHEN n.actor_id IS NULL THEN FALSE
                   ELSE EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.following_id = n.actor_id) END AS following_actor,
              CASE WHEN n.entity_type = 'post' THEN (SELECT p.media_urls[1] FROM posts p WHERE p.id = n.entity_id)
                   WHEN n.entity_type = 'video' THEN (SELECT v.thumbnail_url FROM videos v WHERE v.id = n.entity_id)
                   ELSE NULL END AS preview_url
         FROM notifications n LEFT JOIN users a ON a.id = n.actor_id
        WHERE n.user_id = $1 ${cursorSql}
        ORDER BY n.created_at DESC LIMIT $2`,
      params
    );
    const unread = await db.query('SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND is_read = FALSE', [req.user.id]);
    return sendSuccess(res, { notifications: r.rows, unread_count: unread.rows[0].n, nextCursor: nextCursorOf(r.rows, limit) }, 'Notifications.');
  } catch (error) {
    next(error);
  }
};

exports.unreadCount = async (req, res, next) => {
  try {
    const r = await db.query('SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND is_read = FALSE', [req.user.id]);
    return sendSuccess(res, { count: r.rows[0].n }, 'Unread count.');
  } catch (error) {
    next(error);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(isUuid) : null;
    if (ids && ids.length) {
      await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND id = ANY($2::uuid[])', [req.user.id, ids]);
    } else {
      await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [req.user.id]);
    }
    return sendSuccess(res, {}, 'Marked as read.');
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Notification not found.', 404, 'NOT_FOUND', req);
    await db.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    return sendSuccess(res, { id: req.params.id }, 'Notification removed.');
  } catch (error) {
    next(error);
  }
};
