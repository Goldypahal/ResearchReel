const chatService = require('../services/chatService');

// List All Conversations (Section 3.4.1)
exports.getConversations = async (req, res) => {
  try {
    const list = await chatService.getConversations(req.query.user_id);
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Conversations fetch failed' });
  }
};

// Get Single Conversation Messages (Section 3.4.2)
exports.getMessages = async (req, res) => {
  try {
    const messages = await chatService.getMessages(req.params.conversation_id);
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Message fetch failed' });
  }
};

// Send Message (Persistence)
exports.sendMessage = async (req, res) => {
  try {
    const message = await chatService.sendMessage(req.body);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Message controller error:', error);
    res.status(500).json({ success: false, message: 'Message sending failed' });
  }
};

// Mark as Read (Section 3.4.2)
exports.markAsRead = async (req, res) => {
  try {
    await chatService.markAsRead(req.body);
    res.status(200).json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};
