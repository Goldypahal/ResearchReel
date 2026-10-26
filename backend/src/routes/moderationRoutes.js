const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// Report a Post (Available to any authenticated user)
router.post('/report', authMiddleware, rateLimiter.action('report', { ip: 40, user: 20, window: 3600 }), moderationController.createReport);

// Admin / Moderator Only routes
router.get('/reports', authMiddleware, checkRole(['admin', 'moderator']), moderationController.listReports);
router.post('/reports/:id/resolve', authMiddleware, checkRole(['admin', 'moderator']), moderationController.resolveReport);
router.get('/users', authMiddleware, checkRole(['admin', 'moderator']), moderationController.listUsers);
router.post('/users/:id/verify', authMiddleware, checkRole(['admin', 'moderator']), moderationController.verifyUser);

module.exports = router;
