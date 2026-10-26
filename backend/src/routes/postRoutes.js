const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const { postSchema, documentSchema } = require('../utils/validators');

// Reading is public; signed-in viewers get personalised flags (reacted, saved)
router.get('/feed', optionalAuth, postController.getFeed);
router.get('/trending', optionalAuth, postController.getTrending);
router.get('/tags/trending', postController.getTrendingTags);
router.get('/saved', authMiddleware, postController.getSaved);

// Writing
router.post('/create', authMiddleware, validate(postSchema), postController.createPost);
router.post('/react', authMiddleware, postController.reactToPost);
router.post('/document/upload', authMiddleware, validate(documentSchema), postController.uploadDocument);
router.post('/view', optionalAuth, postController.viewPost);

// Single post + interactions (after static paths)
router.get('/:id', optionalAuth, postController.getPost);
router.delete('/:id', authMiddleware, postController.deletePost);
router.get('/:id/comments', postController.getComments);
router.post('/:id/comments', authMiddleware, postController.addComment);
router.delete('/:id/comments/:commentId', authMiddleware, postController.deleteComment);
router.post('/:id/bookmark', authMiddleware, postController.bookmark);
router.delete('/:id/bookmark', authMiddleware, postController.unbookmark);

module.exports = router;
