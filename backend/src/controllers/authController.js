const authService = require('../services/authService');
const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email && emailRegex.test(email);
};

const extractReqInfo = (req) => ({
  ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
  userAgent: req.headers['user-agent'] || null,
  deviceName: req.headers['user-agent'] ? req.headers['user-agent'].split(' ')[0] : 'Web Browser'
});

// Register User
exports.register = async (req, res, next) => {
  try {
    const { email, username, password, full_name } = req.body;

    if (!email || !validateEmail(email)) {
      return sendError(res, 'A valid email address is required.', 400, 'VALIDATION_ERROR', req);
    }
    if (!username || username.trim().length < 3) {
      return sendError(res, 'Username must be at least 3 characters.', 400, 'VALIDATION_ERROR', req);
    }
    if (!password || password.length < 8) {
      return sendError(res, 'Password must be at least 8 characters.', 400, 'VALIDATION_ERROR', req);
    }
    if (!full_name || full_name.trim().length < 1) {
      return sendError(res, 'Full name is required.', 400, 'VALIDATION_ERROR', req);
    }

    await authService.register({ email, username, password, full_name });
    return sendSuccess(res, { email, requiresVerification: true }, 'Verification code sent.', 201);
  } catch (error) {
    next(error);
  }
};

// Verify OTP
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !validateEmail(email)) {
      return sendError(res, 'A valid email address is required.', 400, 'VALIDATION_ERROR', req);
    }
    if (!otp || otp.trim().length !== 6) {
      return sendError(res, 'Verification OTP must be exactly 6 digits.', 400, 'VALIDATION_ERROR', req);
    }

    const reqInfo = extractReqInfo(req);
    const { user, accessToken, refreshToken } = await authService.verifyOTP({ email, otp, reqInfo });

    // Set HttpOnly cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    return sendSuccess(res, { user, token: accessToken }, 'Verification successful.');
  } catch (error) {
    next(error);
  }
};

// Login User
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !validateEmail(email)) {
      return sendError(res, 'A valid email address is required.', 400, 'VALIDATION_ERROR', req);
    }
    if (!password) {
      return sendError(res, 'Password is required.', 400, 'VALIDATION_ERROR', req);
    }

    const reqInfo = extractReqInfo(req);
    const { user, accessToken, refreshToken } = await authService.login({ email, password, reqInfo });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    return sendSuccess(res, { user, token: accessToken }, 'Login successful.');
  } catch (error) {
    next(error);
  }
};

// Logout User
exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (req.user || refreshToken) {
      await authService.revokeSession(req.user?.id, req.user?.sid, refreshToken);
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return sendSuccess(res, {}, 'Logged out successfully.');
  } catch (error) {
    next(error);
  }
};

// Refresh Tokens (Rotation)
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    const reqInfo = extractReqInfo(req);
    const { user, accessToken, refreshToken } = await authService.refreshTokens(token, reqInfo);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    return sendSuccess(res, { user, token: accessToken }, 'Tokens refreshed successfully.');
  } catch (error) {
    next(error);
  }
};

// ORCID Callback Placeholder
exports.orcidCallback = async (req, res, next) => {
  try {
    const { orcid_id } = req.body;
    const user_id = req.user.id;
    if (!orcid_id) {
      return sendError(res, 'ORCID ID is required.', 400, 'VALIDATION_ERROR', req);
    }
    await db.query('UPDATE users SET orcid_id = $1, verification_status = $2 WHERE id = $3', [orcid_id, 'scholar', user_id]);
    return sendSuccess(res, {}, 'Verified as Scholar.');
  } catch (error) {
    next(error);
  }
};

// Student ID Verification Flow
exports.studentVerification = async (req, res, next) => {
  try {
    const { university } = req.body;
    const user_id = req.user.id;
    if (!university) {
      return sendError(res, 'University name is required.', 400, 'VALIDATION_ERROR', req);
    }
    await db.query('UPDATE users SET verification_status = $1 WHERE id = $2', ['student', user_id]);
    return sendSuccess(res, {}, 'Student ID Submitted for Faculty Approval.');
  } catch (error) {
    next(error);
  }
};
