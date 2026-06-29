const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Public Profiles (Section 3.6.1)
router.get('/:username', userController.getProfile);

// Private Analytics Dashboard (Section 3.6.3 / 15.1)
router.get('/analytics/:user_id', authMiddleware, userController.getAnalytics);

// Account Actions
router.put('/update', authMiddleware, userController.updateProfile);

module.exports = router;
