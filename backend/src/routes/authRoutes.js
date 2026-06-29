const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Public Routes
router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOTP);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Private Routes (Require Token)
router.post('/verify/orcid', authMiddleware, authController.orcidCallback);
router.post('/verify/student', authMiddleware, authController.studentVerification);

module.exports = router;
