const express = require('express');
const router = express.Router();
const social = require('../controllers/socialController');
const emailPrefs = require('../controllers/emailPreferencesController');
const { authMiddleware } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// Public: used by email clients' one-click unsubscribe and the /unsubscribe page.
// Mail providers send it as a form post, so accept urlencoded bodies too.
router.post('/unsubscribe', rateLimiter(30, 60), express.urlencoded({ extended: false }), emailPrefs.unsubscribe);

router.use(authMiddleware);
router.get('/email-preferences', emailPrefs.get);
router.put('/email-preferences', emailPrefs.update);
router.get('/', social.listNotifications);
router.get('/unread-count', social.unreadNotifications);
router.post('/read-all', social.markAllNotificationsRead);
router.post('/:id/read', social.markNotificationRead);

module.exports = router;
