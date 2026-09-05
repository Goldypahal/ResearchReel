const pool = require('../config/db');
const { AuthorizationError, NotFoundError } = require('../utils/errors');

/**
 * Checks if user is an active participant in the conversation
 */
async function isConversationParticipant(userId, conversationId) {
  if (!userId || !conversationId) return false;

  const query = `
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = $1 AND user_id = $2;
  `;
  const result = await pool.query(query, [conversationId, userId]);
  return result.rows.length > 0;
}

/**
 * Middleware enforcing conversation participant authorization
 */
const authorizeConversationAccess = () => {
  return async (req, res, next) => {
    try {
      const conversationId = req.params.conversationId || req.params.id || req.body.conversationId || req.body.conversation_id;
      if (!conversationId) {
        throw new NotFoundError('Conversation ID is required');
      }

      const allowed = await isConversationParticipant(req.user.id, conversationId);
      if (!allowed) {
        throw new AuthorizationError('You are not a participant in this conversation');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  isConversationParticipant,
  authorizeConversationAccess
};
