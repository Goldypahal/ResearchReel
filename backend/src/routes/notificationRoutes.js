const express = require('express');
const router = express.Router();
const social = require('../controllers/socialController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', social.listNotifications);
router.get('/unread-count', social.unreadNotifications);
router.post('/read-all', social.markAllNotificationsRead);
router.post('/:id/read', social.markNotificationRead);

module.exports = router;
