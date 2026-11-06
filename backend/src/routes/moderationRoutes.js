const express = require('express');
const router = express.Router();
const c = require('../controllers/moderationController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

const staff = [authMiddleware, checkRole(['admin', 'moderator'])];

router.post('/report', authMiddleware, rateLimiter(20, 3600), c.createReport);
router.get('/stats', ...staff, c.stats);
router.get('/reports', ...staff, c.listReports);
router.post('/reports/:id/resolve', ...staff, c.resolveReport);
router.get('/users', ...staff, c.listUsers);
router.post('/users/:id/verify', ...staff, c.verifyUser);
router.post('/users/:id/suspend', ...staff, c.setSuspended);
router.get('/audit-log', authMiddleware, checkRole(['admin']), c.auditLog);

module.exports = router;
