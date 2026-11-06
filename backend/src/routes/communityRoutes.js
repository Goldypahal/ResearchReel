const express = require('express');
const router = express.Router();
const discover = require('../controllers/discoverController');
const game = require('../controllers/gamificationController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/explore', optionalAuth, discover.explore);
router.get('/discover', optionalAuth, discover.discover);
router.get('/leaderboard', optionalAuth, game.leaderboard);
router.get('/achievements', optionalAuth, game.achievements);

module.exports = router;
