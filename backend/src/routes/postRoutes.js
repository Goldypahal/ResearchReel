const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Public Feed (Authentication is optional for view)
router.get('/feed', postController.getFeed);

// Private Routes (Require Token)
router.post('/create', authMiddleware, postController.createPost);
router.post('/react', authMiddleware, postController.reactToPost);
router.post('/document/upload', authMiddleware, postController.uploadDocument);
router.post('/view', (req, res, next) => {
  // Make auth optional for tracking views
  if (req.headers.authorization) {
    return authMiddleware(req, res, next);
  }
  next();
}, postController.viewPost);

module.exports = router;


