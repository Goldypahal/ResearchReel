const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authMiddleware } = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const { postSchema, documentSchema } = require('../utils/validators');

// Public Feed (Authentication is optional for view)
router.get('/feed', postController.getFeed);

// Private Routes (Require Token)
router.post('/create', authMiddleware, validate(postSchema), postController.createPost);
router.post('/react', authMiddleware, postController.reactToPost);
router.post('/document/upload', authMiddleware, validate(documentSchema), postController.uploadDocument);
router.post('/view', (req, res, next) => {
  // Make auth optional for tracking views
  if (req.headers.authorization) {
    return authMiddleware(req, res, next);
  }
  next();
}, postController.viewPost);

module.exports = router;


