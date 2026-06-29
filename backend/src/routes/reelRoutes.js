const express = require('express');
const router = express.Router();
const reelController = require('../controllers/reelController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Public Reels Feed
router.get('/', reelController.getReels);

// Private Routes
router.post('/upload', authMiddleware, reelController.uploadReel);
router.post('/react', authMiddleware, reelController.reactToReel);
router.post('/view', authMiddleware, reelController.viewReel);

module.exports = router;

