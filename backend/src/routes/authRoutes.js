const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const validate = require('../middleware/validationMiddleware');
const { registerSchema, loginSchema, otpSchema } = require('../utils/validators');

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
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/v1/auth/verify/orcid:
 *   post:
 *     summary: Complete ORCID oauth verification
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
 *               - orcid_id
 *             properties:
 *               orcid_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: ORCID linked successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/verify/orcid', authMiddleware, authController.orcidCallback);

/**
 * @swagger
 * /api/v1/auth/verify/student:
 *   post:
 *     summary: Complete student academic verification
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
 *               - university
 *             properties:
 *               university:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student verification OTP sent
 *       401:
 *         description: Unauthorized
 */
router.post('/verify/student', authMiddleware, authController.studentVerification);

module.exports = router;
