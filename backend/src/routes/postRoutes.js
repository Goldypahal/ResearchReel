const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const virusScan = require('../middleware/virusScan');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const { postSchema } = require('../utils/validators');

// Reading is public; signed-in viewers get personalised flags (reacted, saved)
router.get('/feed', optionalAuth, postController.getFeed);
router.get('/trending', optionalAuth, postController.getTrending);
router.get('/tags/trending', postController.getTrendingTags);
router.get('/saved', authMiddleware, postController.getSaved);

// Writing
router.post('/create', authMiddleware, rateLimiter.action('create-post', { ip: 60, user: 30, window: 3600 }), validate(postSchema), postController.createPost);

const os = require('os');
const path = require('path');
const multer = require('multer');
const imageUpload = multer({ dest: path.join(os.tmpdir(), 'researchreel-uploads'), limits: { fileSize: 10 * 1024 * 1024, files: 4 } });
router.post('/media', authMiddleware, rateLimiter.action('upload-image', { ip: 60, user: 30, window: 3600 }), (req, res, next) => imageUpload.array('images', 4)(req, res, (err) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') { err.statusCode = 413; err.message = 'Images are limited to 10 MB each.'; }
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') { err.statusCode = 400; err.message = 'Attach up to 4 images.'; }
  err.statusCode = err.statusCode || 400;
  next(err);
}), virusScan, postController.uploadPostImages);
router.post('/react', authMiddleware, rateLimiter.action('react', { ip: 300, user: 120, window: 60 }), postController.reactToPost);
router.post('/view', optionalAuth, postController.viewPost);

// Single post + interactions (after static paths)
router.get('/:id', optionalAuth, postController.getPost);
router.delete('/:id', authMiddleware, postController.deletePost);
router.get('/:id/comments', optionalAuth, postController.getComments);
router.post('/:id/comments', authMiddleware, rateLimiter.action('comment', { ip: 60, user: 20, window: 60 }), postController.addComment);
router.get('/:id/comments/:commentId/replies', optionalAuth, postController.getReplies);
router.patch('/:id/comments/:commentId', authMiddleware, rateLimiter.action('comment', { ip: 60, user: 20, window: 60 }), postController.updateComment);
router.delete('/:id/comments/:commentId', authMiddleware, postController.deleteComment);
router.post('/:id/comments/:commentId/like', authMiddleware, rateLimiter.action('react', { ip: 300, user: 120, window: 60 }), postController.likeComment);
router.delete('/:id/comments/:commentId/like', authMiddleware, postController.likeComment);
router.post('/:id/bookmark', authMiddleware, postController.bookmark);
router.delete('/:id/bookmark', authMiddleware, postController.unbookmark);

module.exports = router;
