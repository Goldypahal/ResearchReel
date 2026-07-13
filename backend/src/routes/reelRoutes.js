const express = require('express');
const router = express.Router();
const reelController = require('../controllers/reelController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/drafts', authMiddleware, reelController.getDrafts);
router.get('/draft/:id', authMiddleware, reelController.getDraft);
router.post('/generate-draft', authMiddleware, reelController.generateDraft);
router.put('/draft/:id', authMiddleware, reelController.updateDraft);
router.post('/publish-draft/:id', authMiddleware, reelController.publishDraft);
router.get('/documents', authMiddleware, reelController.getDocuments);
router.get('/automation', authMiddleware, reelController.getAutomation);
router.post('/automation', authMiddleware, reelController.updateAutomation);

module.exports = router;
