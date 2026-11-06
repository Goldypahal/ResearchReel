const express = require('express');
const router = express.Router();
const c = require('../controllers/doiController');
const { authMiddleware } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

router.get('/paper', rateLimiter(60, 60), c.getPaperByDOI);
router.get('/author', rateLimiter(20, 60), c.getPapersByORCID);
router.post('/import', authMiddleware, rateLimiter(10, 300), c.importByDOIs);

module.exports = router;
