const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Authenticated current user routes
router.get('/me', authMiddleware, userController.getMe);
router.get('/me/analytics', authMiddleware, userController.getAnalytics);

// Private Analytics Dashboard (Legacy endpoint - authenticated)
router.get('/analytics/:user_id', authMiddleware, userController.getAnalytics);

// Account Actions
router.put('/update', authMiddleware, userController.updateProfile);

// Public Profiles (placed after static subpaths to avoid route shadowing)
router.get('/:username', userController.getProfile);

module.exports = router;
