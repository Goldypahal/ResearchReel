const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authMiddleware } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// AI specific strict limit (cost control)
const aiLimiter = rateLimiter(20, 3600); // 20 per hour

// Summarization & Scripting
router.post('/summarize', authMiddleware, aiLimiter, aiController.summarizeDocument);

// RAG Q&A (Section 4.2.2)
router.post('/ask-gemini', authMiddleware, aiLimiter, aiController.askGemini);

// Personalization & Recommendations (Section 3.5.1 / 4.2.3)
router.get('/recommendations', authMiddleware, aiController.getRecommendations);

// Video Editor AI Pipelines (Phase 11)
router.post('/script', authMiddleware, aiLimiter, aiController.generateScript);
router.post('/voice', authMiddleware, aiLimiter, aiController.generateVoice);

module.exports = router;
