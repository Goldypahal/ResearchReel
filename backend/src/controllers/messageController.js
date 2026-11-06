const chatService = require('../services/chatService');
const { moderateText } = require('../utils/moderator');
const { sendSuccess, sendError } = require('../utils/response');
const { isUuid, parsePage } = require('../utils/pagination');

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    if (error instanceof chatService.ChatError) return sendError(res, error.message, error.statusCode, error.code, req);
    next(error);
  }
};

exports.getConversations = handle(async (req, res) => sendSuccess(res, await chatService.getConversations(req.user.id), 'Conversations.'));

exports.getConversation = handle(async (req, res) => {
  if (!isUuid(req.params.conversation_id)) return sendError(res, 'Conversation not found.', 404, 'NOT_FOUND', req);
  return sendSuccess(res, await chatService.getConversation(req.params.conversation_id, req.user.id), 'Conversation.');
});

exports.startConversation = handle(async (req, res) => {
  const username = String(req.body.username || '').trim();
  if (!username) return sendError(res, 'Choose someone to message.', 400, 'VALIDATION_ERROR', req);
  return sendSuccess(res, await chatService.startDirectConversation(req.user.id, username), 'Conversation ready.');
});

exports.getMessages = handle(async (req, res) => {
  const id = req.params.conversation_id;
  if (!isUuid(id)) return sendError(res, 'Conversation not found.', 404, 'NOT_FOUND', req);
  const { limit, cursor } = parsePage(req.query, 50, 100);
  return sendSuccess(res, await chatService.getMessages(id, req.user.id, cursor, limit), 'Messages.');
});

exports.sendMessage = handle(async (req, res) => {
  const conversationId = req.body.conversation_id || req.body.conversationId;
  const content = String(req.body.content || '').trim();
  if (!isUuid(conversationId)) return sendError(res, 'Conversation not found.', 404, 'NOT_FOUND', req);
  if (!content) return sendError(res, 'Message cannot be empty.', 400, 'VALIDATION_ERROR', req);
  if (content.length > 5000) return sendError(res, 'Message is too long (max 5000 characters).', 400, 'VALIDATION_ERROR', req);
  if (!moderateText(content).clean) return sendError(res, 'Your message was blocked by our spam filter.', 400, 'CONTENT_REJECTED', req);
  const message = await chatService.sendMessage({ conversation_id: conversationId, sender_id: req.user.id, content, message_type: 'text' });
  return sendSuccess(res, message, 'Sent.', 201);
});

exports.markAsRead = handle(async (req, res) => {
  const conversationId = req.body.conversation_id || req.body.conversationId;
  if (!isUuid(conversationId)) return sendError(res, 'Conversation not found.', 404, 'NOT_FOUND', req);
  await chatService.markAsRead({ conversation_id: conversationId, user_id: req.user.id });
  return sendSuccess(res, {}, 'Marked as read.');
});

exports.unreadCount = handle(async (req, res) => sendSuccess(res, { count: await chatService.unreadTotal(req.user.id) }, 'Unread count.'));
