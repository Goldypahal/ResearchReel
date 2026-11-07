const express = require('express');
const router = express.Router();
const c = require('../controllers/documentController');
const { authMiddleware, uploadAuth, optionalAuth } = require('../middleware/authMiddleware');
const { documentUpload, verifyFileSignatures } = require('../middleware/upload');
const rateLimiter = require('../middleware/rateLimiter');

router.get('/', optionalAuth, c.list);
router.post('/', uploadAuth, rateLimiter(30, 3600), documentUpload.single('file'), verifyFileSignatures, c.upload);
router.get('/:id', optionalAuth, c.get);
router.put('/:id', authMiddleware, c.update);
router.delete('/:id', authMiddleware, c.remove);
router.post('/:id/reindex', authMiddleware, rateLimiter(10, 3600), c.reindex);

module.exports = router;
