const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const social = require('../controllers/socialController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');

// Authenticated current user routes
router.get('/me', authMiddleware, userController.getMe);
router.get('/me/analytics', authMiddleware, userController.getAnalytics);
router.get('/me/achievements', authMiddleware, social.getAchievements);
router.get('/me/suggestions', authMiddleware, social.getSuggestions);
router.put('/update', authMiddleware, userController.updateProfile);

// Discovery
router.get('/search', optionalAuth, social.searchUsers);
router.get('/leaderboard', optionalAuth, social.getLeaderboard);

// Private analytics (owner or admin)
router.get('/analytics/:user_id', authMiddleware, userController.getAnalytics);

// Public profiles (after static subpaths so they are not shadowed)
router.get('/:username', optionalAuth, social.getProfile);
router.get('/:username/posts', optionalAuth, social.getUserPosts);
router.get('/:username/followers', optionalAuth, social.getFollowers);
router.get('/:username/following', optionalAuth, social.getFollowing);
router.post('/:username/follow', authMiddleware, social.follow);
router.delete('/:username/follow', authMiddleware, social.unfollow);

module.exports = router;
