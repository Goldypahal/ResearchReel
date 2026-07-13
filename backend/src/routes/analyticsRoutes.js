const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Note: Telemetry tracking often supports anonymous sessions (public views),
// so authMiddleware is optional or handled via token presence within the controller.

router.post('/track', analyticsController.trackEvent);

module.exports = router;
