const db = require('../config/db');
const { isBlockedEitherWay } = require('./blockService');
const { emitTo, emitToUser } = require('./socketService');

class ChatError extends Error {
  constructor(message, statusCode = 403, code = 'AUTHORIZATION_ERROR') {
    super(message);
    this.name = 'ChatError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const participantIds = async (conversationId) => {
  const r = await db.query('SELECT user_id FROM conversation_participants WHERE conversation_id = $1', [conversationId]);
  return r.rows.map((x) => x.user_id);
};

const assertParticipant = async (conversationId, userId) => {
  const r = await db.query('SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2', [conversationId, userId]);
  if (!r.rows.length) throw new ChatError('Conversation not found.', 404, 'NOT_FOUND');
};

const CONVERSATION_SELECT = `
  SELECT c.id, c.is_group, c.group_name, c.created_at,
         lm.content AS last_message, lm.sent_at AS last_message_time, lm.sender_id AS last_sender_id,
         (SELECT COUNT(*)::int FROM messages m
           WHERE m.conversation_id = c.id AND m.sender_id <> $1
             AND m.sent_at > COALESCE(me.last_read_at, 'epoch'::timestamptz)) AS unread_count,
         (SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'full_name', u.full_name,
                                             'avatar_url', u.profile_picture_url, 'verification_status', u.verification_status))
            FROM conversation_participants p JOIN users u ON u.id = p.user_id
           WHERE p.conversation_id = c.id AND p.user_id <> $1) AS participants,
         EXISTS (SELECT 1 FROM conversation_participants p JOIN user_blocks ub
                   ON (ub.blocker_id = $1 AND ub.blocked_id = p.user_id) OR (ub.blocker_id = p.user_id AND ub.blocked_id = $1)
                  WHERE p.conversation_id = c.id AND p.user_id <> $1) AS is_blocked
    FROM conversations c
    JOIN conversation_participants me ON me.conversation_id = c.id AND me.user_id = $1
    LEFT JOIN LATERAL (
      SELECT content, sent_at, sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY sent_at DESC LIMIT 1
    ) lm ON TRUE
`;

const getConversations = async (userId) => {
  const r = await db.query(`${CONVERSATION_SELECT} ORDER BY COALESCE(lm.sent_at, c.created_at) DESC LIMIT 100`, [userId]);
  return r.rows.map((row) => ({ ...row, participants: row.participants || [] }));
};

const getConversation = async (conversationId, userId) => {
  await assertParticipant(conversationId, userId);
  const r = await db.query(`${CONVERSATION_SELECT} WHERE c.id = $2`, [userId, conversationId]);
  const row = r.rows[0];
  return row ? { ...row, participants: row.participants || [] } : null;
};

/** Finds or creates the 1:1 conversation between two users. */
const startDirectConversation = async (userId, targetUsername) => {
  const t = await db.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND is_deleted IS NOT TRUE', [targetUsername]);
  const target = t.rows[0];
  if (!target) throw new ChatError('User not found.', 404, 'NOT_FOUND');
  if (target.id === userId) throw new ChatError('You cannot message yourself.', 400, 'VALIDATION_ERROR');
  if (await isBlockedEitherWay(userId, target.id)) throw new ChatError("You can't message this account.", 403, 'BLOCKED');

  const existing = await db.query(
    `SELECT c.id FROM conversations c
       JOIN conversation_participants a ON a.conversation_id = c.id AND a.user_id = $1
       JOIN conversation_participants b ON b.conversation_id = c.id AND b.user_id = $2
      WHERE c.is_group = FALSE
        AND (SELECT COUNT(*) FROM conversation_participants x WHERE x.conversation_id = c.id) = 2
      LIMIT 1`,
    [userId, target.id]
  );
  if (existing.rows[0]) return getConversation(existing.rows[0].id, userId);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const c = await client.query('INSERT INTO conversations (is_group) VALUES (FALSE) RETURNING id');
    const id = c.rows[0].id;
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id, last_read_at) VALUES ($1, $2, NOW()), ($1, $3, NOW())`,
      [id, userId, target.id]
    );
    await client.query('COMMIT');
    return getConversation(id, userId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const MESSAGE_SELECT = `
  SELECT m.id, m.conversation_id, m.sender_id, m.content, m.message_type, m.file_url, m.sent_at, m.sent_at AS created_at,
         u.username, u.full_name, u.profile_picture_url AS avatar_url
    FROM messages m JOIN users u ON u.id = m.sender_id
`;

const getMessages = async (conversationId, userId, cursor, limit = 50) => {
  await assertParticipant(conversationId, userId);
  const params = [conversationId, limit];
  let cursorSql = '';
  if (cursor) { params.push(cursor); cursorSql = 'AND m.sent_at < $3'; }
  const r = await db.query(`${MESSAGE_SELECT} WHERE m.conversation_id = $1 ${cursorSql} ORDER BY m.sent_at DESC LIMIT $2`, params);
  const rows = r.rows;
  const nextCursor = rows.length === limit ? new Date(rows[rows.length - 1].sent_at).toISOString() : null;
  return { messages: rows.reverse(), nextCursor };
};

const sendMessage = async ({ conversation_id: conversationId, sender_id: senderId, content, message_type: type, file_url: fileUrl }) => {
  await assertParticipant(conversationId, senderId);
  // Existing chats stay readable after a block, but nobody can send new messages.
  for (const other of await participantIds(conversationId)) {
    if (other !== senderId && (await isBlockedEitherWay(senderId, other))) {
      throw new ChatError("You can't send messages in this conversation.", 403, 'BLOCKED');
    }
  }
  const ins = await db.query(
    `INSERT INTO messages (conversation_id, sender_id, content, message_type, file_url) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [conversationId, senderId, content, type || 'text', fileUrl || null]
  );
  await db.query('UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2', [conversationId, senderId]);
  const r = await db.query(`${MESSAGE_SELECT} WHERE m.id = $1`, [ins.rows[0].id]);
  const message = r.rows[0];

  emitTo(`conversation:${conversationId}`, 'receive_message', message);
  for (const uid of await participantIds(conversationId)) {
    if (uid !== senderId) emitToUser(uid, 'message_notification', { conversation_id: conversationId, message });
  }
  return message;
};

const markAsRead = async ({ conversation_id: conversationId, user_id: userId }) => {
  await assertParticipant(conversationId, userId);
  await db.query('UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2', [conversationId, userId]);
  await db.query('UPDATE messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL', [conversationId, userId]);
};

const unreadTotal = async (userId) => {
  const r = await db.query(
    `SELECT COUNT(*)::int AS n FROM messages m
       JOIN conversation_participants p ON p.conversation_id = m.conversation_id AND p.user_id = $1
      WHERE m.sender_id <> $1 AND m.sent_at > COALESCE(p.last_read_at, 'epoch'::timestamptz)`,
    [userId]
  );
  return r.rows[0].n;
};

module.exports = { ChatError, getConversations, getConversation, startDirectConversation, getMessages, sendMessage, markAsRead, unreadTotal };
