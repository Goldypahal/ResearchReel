const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authMiddleware } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

router.get('/documents', authMiddleware, rateLimiter.action('search', { ip: 90, user: 45, window: 60 }), searchController.search);

module.exports = router;
