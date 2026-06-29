const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Conversations (Section 3.4.1)
router.get('/conversations', authMiddleware, messageController.getConversations);

// Messages (Section 3.4.2)
router.get('/:conversation_id/messages', authMiddleware, messageController.getMessages);

// Logic
router.post('/send', authMiddleware, messageController.sendMessage);
router.post('/read', authMiddleware, messageController.markAsRead);

module.exports = router;
