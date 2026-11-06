const express = require('express');
const router = express.Router();
const c = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', c.list);
router.get('/unread-count', c.unreadCount);
router.post('/read', c.markRead);
router.delete('/:id', c.remove);

module.exports = router;
