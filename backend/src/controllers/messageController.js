const chatService = require('../services/chatService');
const { sendSuccess, sendError } = require('../utils/response');

// List All Conversations (Section 26 / 27)
exports.getConversations = async (req, res, next) => {
  try {
    const list = await chatService.getConversations(req.user.id);
    return sendSuccess(res, list, 'Conversations retrieved.');
  } catch (error) {
    next(error);
  }
};

// Get Single Conversation Messages (Section 26 / 29)
exports.getMessages = async (req, res, next) => {
  try {
    const conversationId = req.params.conversationId || req.params.conversation_id;
    const { cursor, limit } = req.query;

    const result = await chatService.getMessages(conversationId, req.user.id, cursor, parseInt(limit) || 50);
    return sendSuccess(res, { messages: result.messages, nextCursor: result.nextCursor }, 'Messages retrieved.');
  } catch (error) {
    next(error);
  }
};

// Send Message (Section 28 / 29 - sender_id ALWAYS derived from req.user.id)
exports.sendMessage = async (req, res, next) => {
  try {
    const { conversation_id, conversationId, content, message_type, file_url } = req.body;
    const targetConversationId = conversationId || conversation_id;
    const sender_id = req.user.id; // Enforce server-side sender identity

    if (!targetConversationId || !content) {
      return sendError(res, 'conversationId and content are required.', 400, 'VALIDATION_ERROR', req);
    }

    const message = await chatService.sendMessage({
      conversation_id: targetConversationId,
      sender_id,
      content: content || '',
      message_type: message_type || 'text',
      file_url: file_url || null
    });

    return sendSuccess(res, message, 'Message sent successfully.', 201);
  } catch (error) {
    next(error);
  }
};

// Mark Conversation Messages as Read
exports.markAsRead = async (req, res, next) => {
  try {
    const { conversation_id, conversationId } = req.body;
    const targetConversationId = conversationId || conversation_id;
    const user_id = req.user.id;

    await chatService.markAsRead({ conversation_id: targetConversationId, user_id });
    return sendSuccess(res, {}, 'Messages marked as read.');
  } catch (error) {
    next(error);
  }
};
