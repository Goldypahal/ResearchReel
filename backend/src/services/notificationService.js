const db = require('../config/db');

/**
 * Creates an in-app notification. Never throws: a failed notification must not
 * fail the action that triggered it (a follow, a comment, a reaction).
 */
const notify = async ({ userId, actorId, type, entityType = null, entityId = null, message = null }) => {
  if (!userId || userId === actorId) return null;
  try {
    const result = await db.query(
      `INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, message)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, actorId || null, type, entityType, entityId, message]
    );
    return result.rows[0];
  } catch (err) {
    console.error('[notifications] failed to create notification:', err.message);
    return null;
  }
};

const list = async (userId, { cursor, limit = 30 } = {}) => {
  const params = [userId];
  let where = 'n.user_id = $1';
  if (cursor) {
    params.push(cursor);
    where += ` AND n.created_at < $${params.length}`;
  }
  params.push(Math.min(Number(limit) || 30, 100));

  const result = await db.query(
    `SELECT n.id, n.type, n.entity_type, n.entity_id, n.message, n.is_read, n.created_at,
            u.id AS actor_id, u.username AS actor_username, u.full_name AS actor_full_name,
            COALESCE(u.avatar_url, u.profile_picture_url) AS actor_avatar_url
     FROM notifications n
     LEFT JOIN users u ON u.id = n.actor_id
     WHERE ${where}
     ORDER BY n.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  const rows = result.rows;
  return {
    notifications: rows,
    nextCursor: rows.length ? rows[rows.length - 1].created_at.toISOString() : null
  };
};

const unreadCount = async (userId) => {
  const result = await db.query(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return result.rows[0].count;
};

const markRead = async (userId, notificationId) => {
  const result = await db.query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id',
    [notificationId, userId]
  );
  return result.rowCount > 0;
};

const markAllRead = async (userId) => {
  await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [userId]);
};

module.exports = { notify, list, unreadCount, markRead, markAllRead };
