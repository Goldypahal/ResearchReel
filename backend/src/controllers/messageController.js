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

// Start (or reopen) a direct conversation: { username }
exports.startConversation = async (req, res, next) => {
  try {
    const { username } = req.body || {};
    if (!username) return sendError(res, 'username is required.', 400, 'VALIDATION_ERROR', req);
    const { id, created } = await chatService.startDirectConversation(req.user.id, username);
    const all = await chatService.getConversations(req.user.id);
    const conversation = all.find((c) => c.id === id) || { id };
    return sendSuccess(res, conversation, created ? 'Conversation started.' : 'Conversation found.', created ? 201 : 200);
  } catch (error) {
    next(error);
  }
};

// Get Single Conversation Messages (Section 26 / 29)
exports.getMessages = async (req, res, next) => {
  try {
    const conversationId = req.params.conversationId || req.params.conversation_id;
    const { cursor, limit } = req.query;

    if (!isUuid(conversationId)) return sendError(res, 'Conversation not found.', 404, 'NOT_FOUND', req);
    const result = await chatService.getMessages(conversationId, req.user.id, cursor, parseInt(limit) || 50);
    return sendSuccess(res, { messages: result.messages, nextCursor: result.nextCursor }, 'Messages retrieved.');
  } catch (error) {
    next(error);
  }
};

const MAX_MESSAGE_LENGTH = 4000;
const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));

// Send Message: sender is always the caller. Only text messages exist today, so
// client-supplied attachment URLs and message types are refused rather than stored.
exports.sendMessage = async (req, res, next) => {
  try {
    const { conversation_id, conversationId, content, message_type, file_url } = req.body || {};
    const targetConversationId = conversationId || conversation_id;
    const text = typeof content === 'string' ? content.trim() : '';

    if (!isUuid(targetConversationId)) {
      return sendError(res, 'Conversation not found.', 404, 'NOT_FOUND', req);
    }
    if (!text) return sendError(res, 'Write a message first.', 400, 'VALIDATION_ERROR', req);
    if (text.length > MAX_MESSAGE_LENGTH) {
      return sendError(res, `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`, 400, 'VALIDATION_ERROR', req);
    }
    if ((message_type && message_type !== 'text') || file_url) {
      return sendError(res, 'Only text messages are supported.', 400, 'VALIDATION_ERROR', req);
    }

    const message = await chatService.sendMessage({
      conversation_id: targetConversationId,
      sender_id: req.user.id,
      content: text,
      message_type: 'text',
      file_url: null
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
    if (!isUuid(targetConversationId)) return sendError(res, 'Conversation not found.', 404, 'NOT_FOUND', req);

    await chatService.markAsRead({ conversation_id: targetConversationId, user_id });
    return sendSuccess(res, {}, 'Messages marked as read.');
  } catch (error) {
    next(error);
  }
};
