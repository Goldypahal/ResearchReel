const express = require('express');
const router = express.Router();
const social = require('../controllers/socialController');
const { authMiddleware } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

router.use(authMiddleware);
router.get('/', social.listStories);
router.post('/', rateLimiter.action('create-story', { ip: 60, user: 30, window: 86400 }), social.createStory);
router.post('/:id/view', social.viewStory);
router.delete('/:id', social.deleteStory);

module.exports = router;
