const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// Conversations (Section 3.4.1)
router.get('/conversations', authMiddleware, messageController.getConversations);
router.post('/conversations', authMiddleware, rateLimiter.action('start-conversation', { ip: 60, user: 20, window: 3600 }), messageController.startConversation);

// Messages (Section 3.4.2)
router.get('/:conversation_id/messages', authMiddleware, messageController.getMessages);

// Logic
router.post('/send', authMiddleware, rateLimiter.action('send-message', { ip: 120, user: 30, window: 60 }), messageController.sendMessage);
router.post('/read', authMiddleware, messageController.markAsRead);

module.exports = router;
