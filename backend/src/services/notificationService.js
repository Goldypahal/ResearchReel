const db = require('../config/db');
const { emitToUser } = require('./socketService');

/**
 * Creates an in-app notification and pushes it to the recipient in real time.
 * Never notifies users about their own actions. Failures are logged, not thrown,
 * so a notification problem never breaks the action that triggered it.
 */
const notify = async ({ userId, actorId, type, entityType = null, entityId = null, message = null }) => {
  if (!userId || (actorId && userId === actorId)) return null;
  try {
    const res = await db.query(
      `INSERT INTO notifications (user_id, actor_id, type, entity_type, entity_id, message)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, actorId || null, type, entityType, entityId, message]
    );
    const row = res.rows[0];
    let actor = null;
    if (actorId) {
      const a = await db.query('SELECT username, full_name, profile_picture_url FROM users WHERE id = $1', [actorId]);
      actor = a.rows[0] || null;
    }
    const payload = {
      ...row,
      actor_username: actor?.username || null,
      actor_full_name: actor?.full_name || null,
      actor_avatar_url: actor?.profile_picture_url || null
    };
    emitToUser(userId, 'notification', payload);
    return payload;
  } catch (err) {
    console.error('[notifications] Failed to create notification:', err.message);
    return null;
  }
};

/** Removes a notification when the triggering action is undone (e.g. unlike, unfollow). */
const retract = async ({ userId, actorId, type, entityId = null }) => {
  try {
    await db.query(
      `DELETE FROM notifications
        WHERE user_id = $1 AND actor_id = $2 AND type = $3
          AND (($4::uuid IS NULL AND entity_id IS NULL) OR entity_id = $4::uuid)
          AND is_read = FALSE`,
      [userId, actorId, type, entityId]
    );
  } catch (err) {
    console.error('[notifications] Failed to retract notification:', err.message);
  }
};

module.exports = { notify, retract };
