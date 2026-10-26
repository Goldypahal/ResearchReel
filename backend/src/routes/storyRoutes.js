const express = require('express');
const router = express.Router();
const social = require('../controllers/socialController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', social.listStories);
router.post('/', social.createStory);
router.post('/:id/view', social.viewStory);
router.delete('/:id', social.deleteStory);

module.exports = router;
