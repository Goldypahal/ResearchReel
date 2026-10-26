const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { optionalAuth } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// Anonymous visitors can send telemetry too; signed-in events are attributed.
router.post('/track', rateLimiter(60, 60), optionalAuth, analyticsController.trackEvent);

module.exports = router;
