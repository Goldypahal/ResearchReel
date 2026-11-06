const express = require('express');
const router = express.Router();
const c = require('../controllers/searchController');
const { optionalAuth } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

router.get('/', optionalAuth, rateLimiter(60, 60), c.search);
router.get('/trending-tags', c.trendingTags);

module.exports = router;
