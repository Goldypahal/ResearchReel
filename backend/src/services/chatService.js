const db = require('../config/db');
const { getIO } = require('./socketService');
const { publishMessage } = require('./messagePublisher');

const getConversations = async (user_id) => {
  const list = await db.query(`
    SELECT 
      c.*, 
      (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) as last_message,
      (SELECT sent_at FROM messages m WHERE m.conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) as last_message_time,
      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.read_at IS NULL AND m.sender_id != $1) as unread_count
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    WHERE cp.user_id = $1
    ORDER BY last_message_time DESC
  `, [user_id]);

  return list.rows;
};

const getMessages = async (conversation_id, cursor, limit = 50) => {
  let query = `
    SELECT m.*, u.username, u.profile_picture_url
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

  let nextCursor = null;
  if (messages.rows.length > 0) {
    nextCursor = messages.rows[messages.rows.length - 1].sent_at.toISOString();
  }

  // Reverse so they are chronologically ordered for the UI
  const results = messages.rows.reverse();

  return { messages: results, nextCursor };
};

const sendMessage = async ({ conversation_id, sender_id, content, message_type, file_url }) => {
  const newMessage = await db.query(
    `INSERT INTO messages (conversation_id, sender_id, content, message_type, file_url) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [conversation_id, sender_id, content, message_type, file_url]
  );

  const payload = {
    ...newMessage.rows[0],
    origin: process.env.SERVER_ID || 'local-server'
  };

  try {
    const io = getIO();
    io.to(conversation_id).emit('receive_message', payload);
  } catch (socketError) {
    console.warn('Socket broadcast skipped:', socketError.message);
  }

  await publishMessage(conversation_id, payload);
  return newMessage.rows[0];
};

const markAsRead = async ({ conversation_id, user_id }) => {
  await db.query(
    'UPDATE messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL',
    [conversation_id, user_id]
  );
  return true;
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead
};
