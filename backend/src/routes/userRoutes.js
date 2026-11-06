const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, uploadAuth, optionalAuth } = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const { profileUpdateSchema } = require('../utils/validators');
const { imageUpload, verifyFileSignatures } = require('../middleware/upload');

router.get('/me', authMiddleware, userController.getMe);
router.get('/me/analytics', authMiddleware, userController.getAnalytics);
router.put('/me', authMiddleware, validate(profileUpdateSchema), userController.updateProfile);
router.put('/update', authMiddleware, validate(profileUpdateSchema), userController.updateProfile);
router.post('/me/avatar', uploadAuth, imageUpload.single('avatar'), verifyFileSignatures, userController.uploadAvatar);
router.delete('/me/avatar', authMiddleware, userController.removeAvatar);
router.delete('/me', authMiddleware, userController.deleteAccount);
router.get('/suggestions', optionalAuth, userController.getSuggestions);
router.get('/analytics/:user_id', authMiddleware, userController.getAnalytics);

router.get('/:username', optionalAuth, userController.getProfile);
router.post('/:username/follow', authMiddleware, userController.follow);
router.delete('/:username/follow', authMiddleware, userController.unfollow);
router.get('/:username/followers', optionalAuth, userController.getFollowers);
router.get('/:username/following', optionalAuth, userController.getFollowing);

module.exports = router;
