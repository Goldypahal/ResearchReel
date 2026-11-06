const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

const aiLimiter = rateLimiter(20, 60);

router.get('/status', aiController.status);
router.post('/summarize', authMiddleware, aiLimiter, aiController.summarizeDocument);
router.post('/ask', authMiddleware, aiLimiter, aiController.ask);
router.post('/ask-gemini', authMiddleware, aiLimiter, aiController.ask);
router.get('/conversations', authMiddleware, aiController.listConversations);
router.get('/conversations/:id', authMiddleware, aiController.getConversation);
router.delete('/conversations/:id', authMiddleware, aiController.deleteConversation);
router.get('/recommendations', optionalAuth, aiController.getRecommendations);

module.exports = router;
