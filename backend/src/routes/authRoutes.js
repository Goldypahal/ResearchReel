const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const validate = require('../middleware/validationMiddleware');
const { registerSchema, loginSchema, otpSchema, emailOnlySchema, resetPasswordSchema } = require('../utils/validators');

// Specific Rate Limiters
const registerLimiter = rateLimiter(5, 3600); // 5 per hour
const loginLimiter = rateLimiter(10, 900); // 10 per 15 mins
const otpLimiter = rateLimiter(5, 300); // 5 per 5 mins

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: Verification OTP sent to email
 *       400:
 *         description: Validation error
 */
router.post('/register', registerLimiter, validate(registerSchema), authController.register);

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     summary: Verify email OTP to complete registration
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: User successfully verified and registered
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/verify-otp', otpLimiter, validate(otpSchema), authController.verifyOTP);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user and return JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 */
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

// Sign-up code resend and password recovery (responses never reveal whether an account exists)
router.post('/resend-otp', otpLimiter, validate(emailOnlySchema), authController.resendVerification);
router.post('/password/forgot', otpLimiter, validate(emailOnlySchema), authController.forgotPassword);
router.post('/password/reset', otpLimiter, validate(resetPasswordSchema), authController.resetPassword);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', optionalAuth, authController.logout);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access and refresh tokens set in cookies
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', authController.refreshToken);


/**
 * @swagger
 * /api/v1/auth/orcid/start:
 *   post:
 *     summary: Start ORCID sign-in; returns the ORCID authorize URL to redirect the browser to
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authorize URL
 *       503:
 *         description: ORCID is not configured on this server
 */
router.post('/orcid/start', authMiddleware, authController.orcidStart);
router.get('/orcid/callback', authController.orcidCallback);
router.delete('/orcid', authMiddleware, authController.orcidDisconnect);

/**
 * @swagger
 * /api/v1/auth/verify/student:
 *   post:
 *     summary: Send a verification code to a university email address
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student verification OTP sent
 *       401:
 *         description: Unauthorized
 */
router.post('/verify/student', authMiddleware, otpLimiter, authController.studentVerification);
router.post('/verify/student/confirm', authMiddleware, otpLimiter, authController.confirmStudentVerification);

// Account security (signed-in devices, password)
const account = require('../controllers/accountController');
router.get('/sessions', authMiddleware, account.listSessions);
router.delete('/sessions/:id', authMiddleware, account.revokeSession);
router.post('/sessions/revoke-others', authMiddleware, account.revokeOtherSessions);
router.put('/password', authMiddleware, loginLimiter, account.changePassword);

module.exports = router;
