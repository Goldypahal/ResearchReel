const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Summarization & Scripting
router.post('/summarize', authMiddleware, aiController.summarizeDocument);

// RAG Q&A (Section 4.2.2)
router.post('/ask-gemini', authMiddleware, aiController.askGemini);

// Personalization & Recommendations (Section 3.5.1 / 4.2.3)
router.get('/recommendations', authMiddleware, aiController.getRecommendations);

module.exports = router;
