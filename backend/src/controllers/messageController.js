const chatService = require('../services/chatService');

// List All Conversations (Section 3.4.1)
exports.getConversations = async (req, res) => {
  try {
    const list = await chatService.getConversations(req.user.id);
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    console.error(error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Conversations fetch failed' });
  }
};

// Get Single Conversation Messages (Section 3.4.2)
exports.getMessages = async (req, res) => {
  try {
    const { cursor, limit } = req.query;
    const result = await chatService.getMessages(req.params.conversation_id, req.user.id, cursor, parseInt(limit) || 50);
    res.status(200).json({ success: true, data: result.messages, nextCursor: result.nextCursor });
  } catch (error) {
    console.error(error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Message fetch failed' });
  }
};

// Send Message (Persistence)
exports.sendMessage = async (req, res) => {
  try {
    const { conversation_id, content, message_type, file_url } = req.body;
    const sender_id = req.user.id;
    const message = await chatService.sendMessage({ conversation_id, sender_id, content, message_type, file_url });
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Message controller error:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Message sending failed' });
  }
};

// Mark as Read (Section 3.4.2)
exports.markAsRead = async (req, res) => {
  try {
    const { conversation_id } = req.body;
    const user_id = req.user.id;
    await chatService.markAsRead({ conversation_id, user_id });
    res.status(200).json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    console.error(error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Update failed' });
  }
};

