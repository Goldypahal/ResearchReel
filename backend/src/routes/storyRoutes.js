const express = require('express');
const router = express.Router();
const c = require('../controllers/storyController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const { imageUpload, verifyFileSignatures } = require('../middleware/upload');
const rateLimiter = require('../middleware/rateLimiter');

router.get('/', optionalAuth, c.list);
router.post('/', authMiddleware, rateLimiter(30, 3600), imageUpload.single('image'), verifyFileSignatures, c.create);
router.post('/:id/view', authMiddleware, c.markViewed);
router.get('/:id/viewers', authMiddleware, c.viewers);
router.delete('/:id', authMiddleware, c.remove);

module.exports = router;
