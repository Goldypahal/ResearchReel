const db = require('../config/db');
const { getIO } = require('./socketService');
const { publishMessage } = require('./messagePublisher');

class ChatError extends Error {
  constructor(message, statusCode = 403) {
    super(message);
    this.name = 'ChatError';
    this.statusCode = statusCode;
  }
}

/** Fails closed: any lookup error denies access. */
const checkParticipant = async (conversation_id, user_id) => {
  if (!conversation_id || !user_id) {
    throw new ChatError('Forbidden: Not a participant in this conversation', 403);
  }
  const check = await db.query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversation_id, user_id]
  );
  if (!check || !check.rows || check.rows.length === 0) {
    throw new ChatError('Forbidden: Not a participant in this conversation', 403);
  }
};

const isParticipant = async (conversation_id, user_id) => {
  try {
    await checkParticipant(conversation_id, user_id);
    return true;
  } catch (_) {
    return false;
  }
};

const getConversations = async (user_id) => {
  const list = await db.query(`
    SELECT
      c.id, c.is_group, c.group_name, c.created_at,
      lm.content AS last_message,
      lm.sent_at AS last_message_time,
      lm.sender_id AS last_message_sender_id,
      (SELECT COUNT(*)::int FROM messages m
        WHERE m.conversation_id = c.id AND m.sender_id <> $1
          AND m.sent_at > COALESCE(cp.last_read_at, 'epoch'::timestamptz)) AS unread_count,
      (SELECT json_agg(json_build_object(
          'id', u.id, 'username', u.username, 'full_name', u.full_name,
          'avatar_url', COALESCE(u.avatar_url, u.profile_picture_url),
          'verification_status', u.verification_status))
        FROM conversation_participants op JOIN users u ON u.id = op.user_id
        WHERE op.conversation_id = c.id AND op.user_id <> $1) AS participants
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $1
    LEFT JOIN LATERAL (
      SELECT content, sent_at, sender_id FROM messages m
      WHERE m.conversation_id = c.id ORDER BY sent_at DESC LIMIT 1
    ) lm ON TRUE
    ORDER BY COALESCE(lm.sent_at, c.created_at) DESC
  `, [user_id]);

  return list ? (list.rows || []).map((row) => ({ ...row, participants: row.participants || [] })) : [];
};

/** Finds the existing 1:1 conversation with another user, or creates it. */
const startDirectConversation = async (user_id, username) => {
  const target = await db.query(
    `SELECT id FROM users WHERE lower(username) = lower($1) AND (is_deleted IS NULL OR is_deleted = FALSE)`,
    [username]
  );
  if (!target.rows.length) throw new ChatError('User not found.', 404);
  const otherId = target.rows[0].id;
  if (otherId === user_id) throw new ChatError('You cannot message yourself.', 400);

  const existing = await db.query(`
    SELECT c.id FROM conversations c
    JOIN conversation_participants a ON a.conversation_id = c.id AND a.user_id = $1
    JOIN conversation_participants b ON b.conversation_id = c.id AND b.user_id = $2
    WHERE c.is_group = FALSE
      AND (SELECT COUNT(*) FROM conversation_participants x WHERE x.conversation_id = c.id) = 2
    LIMIT 1
  `, [user_id, otherId]);
  if (existing.rows.length) return { id: existing.rows[0].id, created: false };

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const conv = await client.query('INSERT INTO conversations (is_group) VALUES (FALSE) RETURNING id');
    const id = conv.rows[0].id;
    await client.query(
      'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
      [id, user_id, otherId]
    );
    await client.query('COMMIT');
    return { id, created: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getMessages = async (conversation_id, user_id, cursor, limit = 50) => {
  await checkParticipant(conversation_id, user_id);

  let query = `
    SELECT m.*, u.username, u.full_name, COALESCE(u.avatar_url, u.profile_picture_url) AS avatar_url
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = $1
  `;
  const params = [conversation_id];

  if (cursor) {
    query += ` AND m.sent_at < $2`;
    params.push(cursor);
  }

  query += ` ORDER BY m.sent_at DESC LIMIT $${cursor ? 3 : 2}`;
  params.push(limit);

  const messages = await db.query(query, params);
  const rows = messages ? (messages.rows || []) : [];

  let nextCursor = null;
  if (rows.length > 0 && rows[rows.length - 1].sent_at) {
    nextCursor = rows[rows.length - 1].sent_at.toISOString();
  }

  const results = [...rows].reverse();
  return { messages: results, nextCursor };
};

const sendMessage = async ({ conversation_id, sender_id, content, message_type, file_url }) => {
  await checkParticipant(conversation_id, sender_id);

  const newMessage = await db.query(
    `INSERT INTO messages (conversation_id, sender_id, content, message_type, file_url) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [conversation_id, sender_id, content, message_type || 'text', file_url || null]
  );

  let messageRow = newMessage && newMessage.rows ? newMessage.rows[0] : { conversation_id, sender_id, content };
  const sender = await db.query(
    'SELECT username, full_name, COALESCE(avatar_url, profile_picture_url) AS avatar_url FROM users WHERE id = $1',
    [sender_id]
  );
  if (sender && sender.rows && sender.rows[0]) messageRow = { ...messageRow, ...sender.rows[0] };
  await db.query(
    'UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2',
    [conversation_id, sender_id]
  );
  const payload = {
    ...messageRow,
    origin: process.env.SERVER_ID || 'local-server'
  };

  try {
    const io = getIO();
    io.to(conversation_id).emit('receive_message', payload);
  } catch (socketError) {
    console.warn('Socket broadcast skipped:', socketError.message);
  }

  await publishMessage(conversation_id, payload);
  return messageRow;
};

const markAsRead = async ({ conversation_id, user_id }) => {
  await checkParticipant(conversation_id, user_id);

  await db.query(
    'UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2',
    [conversation_id, user_id]
  );
};

module.exports = {
  checkParticipant,
  isParticipant,
  startDirectConversation,
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  ChatError
};
