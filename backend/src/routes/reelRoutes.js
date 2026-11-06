const express = require('express');
const router = express.Router();
const c = require('../controllers/reelController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const { commentSchema } = require('../utils/validators');
const rateLimiter = require('../middleware/rateLimiter');

// Generator / drafts
router.get('/drafts', authMiddleware, c.getDrafts);
router.get('/draft/:id', authMiddleware, c.getDraft);
router.post('/generate-draft', authMiddleware, rateLimiter(30, 3600), c.generateDraft);
router.put('/draft/:id', authMiddleware, c.updateDraft);
router.delete('/draft/:id', authMiddleware, c.deleteDraft);
router.post('/publish-draft/:id', authMiddleware, rateLimiter(20, 3600), c.publishDraft);
router.get('/documents', authMiddleware, c.getDocuments);
router.get('/automation', authMiddleware, c.getAutomation);
router.post('/automation', authMiddleware, c.updateAutomation);

// Published reels
router.get('/', optionalAuth, c.listReels);
router.get('/saved', authMiddleware, c.getSavedReels);
router.delete('/comments/:commentId', authMiddleware, c.deleteComment);
router.get('/:id', optionalAuth, c.getReel);
router.delete('/:id', authMiddleware, c.deleteReel);
router.post('/:id/like', authMiddleware, c.like);
router.delete('/:id/like', authMiddleware, c.unlike);
router.post('/:id/save', authMiddleware, c.save);
router.delete('/:id/save', authMiddleware, c.unsave);
router.get('/:id/comments', optionalAuth, c.getComments);
router.post('/:id/comments', authMiddleware, rateLimiter(60, 600), validate(commentSchema), c.addComment);
router.post('/:id/view', optionalAuth, c.view);

module.exports = router;
