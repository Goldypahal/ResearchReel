const express = require('express');
const router = express.Router();
const c = require('../controllers/messageController');
const { authMiddleware } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

router.use(authMiddleware);
router.get('/conversations', c.getConversations);
router.post('/conversations', c.startConversation);
router.get('/unread-count', c.unreadCount);
router.get('/conversations/:conversation_id', c.getConversation);
router.get('/:conversation_id/messages', c.getMessages);
router.post('/send', rateLimiter(120, 60), c.sendMessage);
router.post('/read', c.markAsRead);

module.exports = router;
