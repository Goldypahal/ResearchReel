const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const validate = require('../middleware/validationMiddleware');
const v = require('../utils/validators');

const registerLimiter = rateLimiter(10, 3600);
const loginLimiter = rateLimiter(20, 900);
const otpLimiter = rateLimiter(10, 300);
const resetLimiter = rateLimiter(5, 900);

router.get('/config', authController.config);
router.post('/register', registerLimiter, validate(v.registerSchema), authController.register);
router.post('/verify-otp', otpLimiter, validate(v.otpSchema), authController.verifyOTP);
router.post('/resend-otp', otpLimiter, validate(v.emailOnlySchema), authController.resendOtp);
router.post('/login', loginLimiter, validate(v.loginSchema), authController.login);
router.post('/logout', optionalAuth, authController.logout);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', resetLimiter, validate(v.emailOnlySchema), authController.forgotPassword);
router.post('/reset-password', resetLimiter, validate(v.resetPasswordSchema), authController.resetPassword);
router.post('/change-password', authMiddleware, validate(v.changePasswordSchema), authController.changePassword);
router.get('/sessions', authMiddleware, authController.listSessions);
router.delete('/sessions/:id', authMiddleware, authController.revokeSession);
router.get('/socket-token', authMiddleware, authController.socketToken);
router.get('/upload-token', authMiddleware, authController.uploadToken);
router.post('/verify/orcid', authMiddleware, authController.orcidCallback);
router.post('/verify/student', authMiddleware, authController.studentVerification);

module.exports = router;
