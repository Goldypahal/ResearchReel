const express = require('express');
const router = express.Router();
const c = require('../controllers/notificationController');
const emailPrefs = require('../controllers/emailPreferencesController');
const { authMiddleware } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// One-click unsubscribe (RFC 8058): no sign-in, the signed token identifies the user.
// POST only, so link scanners that prefetch URLs can't unsubscribe anyone.
router.post('/unsubscribe', rateLimiter(30, 60), express.urlencoded({ extended: false }), emailPrefs.unsubscribe);

router.use(authMiddleware);
router.get('/', c.list);
router.get('/unread-count', c.unreadCount);
router.post('/read', c.markRead);
router.get('/email-preferences', emailPrefs.get);
router.put('/email-preferences', emailPrefs.update);
router.delete('/:id', c.remove);

module.exports = router;
