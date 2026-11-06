const express = require('express');
const router = express.Router();
const c = require('../controllers/postController');
const { authMiddleware, uploadAuth, optionalAuth } = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const { commentSchema } = require('../utils/validators');
const { mixedUpload, verifyFileSignatures, IMAGE_TYPES } = require('../middleware/upload');
const rateLimiter = require('../middleware/rateLimiter');

const postUpload = mixedUpload.fields([{ name: 'images', maxCount: 10 }, { name: 'document', maxCount: 1 }]);
const checkFieldTypes = (req, res, next) => {
  const bad = (req.files?.images || []).find((f) => !IMAGE_TYPES.includes(f.mimetype))
    || (req.files?.document || []).find((f) => f.mimetype !== 'application/pdf');
  if (bad) return res.status(400).json({ success: false, message: `"${bad.originalname}" is not an allowed file type for that field.` });
  next();
};

router.get('/feed', optionalAuth, c.getFeed);
router.get('/saved', authMiddleware, c.getSaved);
router.post('/', uploadAuth, rateLimiter(60, 3600), postUpload, checkFieldTypes, verifyFileSignatures, c.createPost);
router.post('/create', authMiddleware, rateLimiter(60, 3600), postUpload, checkFieldTypes, verifyFileSignatures, c.createPost);
router.post('/react', authMiddleware, c.like);
router.post('/view', optionalAuth, c.viewPost);
router.delete('/comments/:commentId', authMiddleware, c.deleteComment);

router.get('/:id', optionalAuth, c.getPost);
router.delete('/:id', authMiddleware, c.deletePost);
router.post('/:id/like', authMiddleware, c.like);
router.delete('/:id/like', authMiddleware, c.unlike);
router.post('/:id/bookmark', authMiddleware, c.bookmark);
router.delete('/:id/bookmark', authMiddleware, c.unbookmark);
router.get('/:id/comments', optionalAuth, c.getComments);
router.post('/:id/comments', authMiddleware, rateLimiter(60, 600), validate(commentSchema), c.addComment);
router.post('/:id/view', optionalAuth, c.viewPost);

module.exports = router;
