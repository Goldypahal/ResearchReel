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
    const { user, accessToken, refreshToken, requiresVerification } = await authService.login({ email, password, reqInfo });
    if (requiresVerification) {
      return sendSuccess(res, { email, requiresVerification: true }, 'Please verify your email. A new code has been sent.');
    }

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

// ---------------------------------------------------------------------------
// ORCID verification (OAuth 2.0 authorization-code flow)
// The ORCID iD comes from ORCID's token response, never from the client, so a
// user can only link an iD they can sign in to.
// ---------------------------------------------------------------------------
const crypto = require('crypto');
const axios = require('axios');
const redisClient = require('../config/redisClient');
const { sendStudentCode } = require('../utils/emailService');

const ORCID_BASE = process.env.ORCID_BASE_URL || 'https://orcid.org'; // https://sandbox.orcid.org for testing
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const orcidRedirectUri = (req) =>
  process.env.ORCID_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/v1/auth/orcid/callback`;
const HIGHER_THAN_SCHOLAR = ['faculty', 'admin'];

exports.orcidStart = async (req, res, next) => {
  try {
    if (!process.env.ORCID_CLIENT_ID || !process.env.ORCID_CLIENT_SECRET) {
      return sendError(res, 'ORCID sign-in is not enabled on this server.', 503, 'ORCID_NOT_CONFIGURED', req);
    }
    const state = crypto.randomBytes(24).toString('hex');
    await redisClient.set(`orcid_state:${state}`, req.user.id, { EX: 600 });
    const url = `${ORCID_BASE}/oauth/authorize?${new URLSearchParams({
      client_id: process.env.ORCID_CLIENT_ID,
      response_type: 'code',
      scope: '/authenticate',
      redirect_uri: orcidRedirectUri(req),
      state,
    })}`;
    return sendSuccess(res, { url }, 'Redirect to ORCID to continue.');
  } catch (error) {
    next(error);
  }
};

/** ORCID redirects the browser here; we finish the exchange and send the user back to Settings. */
exports.orcidCallback = async (req, res) => {
  const back = (status) => res.redirect(`${FRONTEND_URL}/settings?orcid=${status}`);
  try {
    const { code, state, error } = req.query;
    if (error) return back('cancelled');
    if (!code || !state || !/^[a-f0-9]{48}$/.test(String(state))) return back('failed');

    const userId = await redisClient.get(`orcid_state:${state}`);
    if (!userId) return back('expired');
    await redisClient.del(`orcid_state:${state}`);

    const tokenRes = await axios.post(
      `${ORCID_BASE}/oauth/token`,
      new URLSearchParams({
        client_id: process.env.ORCID_CLIENT_ID,
        client_secret: process.env.ORCID_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: orcidRedirectUri(req),
      }).toString(),
      { headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );
    const orcid = tokenRes.data?.orcid;
    if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid || '')) return back('failed');

    const taken = await db.query('SELECT id FROM users WHERE orcid_id = $1 AND id <> $2', [orcid, userId]);
    if (taken.rows.length) return back('in_use');

    await db.query(
      `UPDATE users SET orcid_id = $1,
         verification_status = CASE WHEN verification_status = ANY($3::text[]) THEN verification_status ELSE 'scholar' END,
         full_name = COALESCE(NULLIF(full_name, ''), $4)
       WHERE id = $2`,
      [orcid, userId, HIGHER_THAN_SCHOLAR, tokenRes.data?.name || null]
    );
    return back('connected');
  } catch (err) {
    console.error('[orcid] callback failed:', err.response?.data || err.message);
    return back('failed');
  }
};

exports.orcidDisconnect = async (req, res, next) => {
  try {
    await db.query(
      `UPDATE users SET orcid_id = NULL,
         verification_status = CASE WHEN verification_status = 'scholar' THEN 'verified' ELSE verification_status END
       WHERE id = $1`,
      [req.user.id]
    );
    return sendSuccess(res, {}, 'ORCID disconnected.');
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Student verification: prove control of an academic mailbox.
// ---------------------------------------------------------------------------
const ACADEMIC_DOMAIN = /(\.edu|\.edu\.[a-z]{2}|\.ac\.[a-z]{2}|\.ac\.[a-z]{2}\.[a-z]{2})$/i;
const extraDomains = (process.env.ACADEMIC_EMAIL_DOMAINS || '').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
const isAcademicEmail = (email) => {
  const domain = String(email).split('@')[1]?.toLowerCase() || '';
  return ACADEMIC_DOMAIN.test(domain) || extraDomains.some((d) => domain === d || domain.endsWith(`.${d}`));
};

exports.studentVerification = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!validateEmail(email)) {
      return sendError(res, 'Enter your university email address.', 400, 'VALIDATION_ERROR', req);
    }
    if (!isAcademicEmail(email)) {
      return sendError(res, 'Use your university email (for example name@university.edu or name@uni.ac.uk).', 400, 'NOT_ACADEMIC_EMAIL', req);
    }
    const code = crypto.randomInt(100000, 1000000).toString();
    await redisClient.set(`student_code:${req.user.id}`, JSON.stringify({ code, email, attempts: 0 }), { EX: 600 });
    await sendStudentCode(email, code);
    return sendSuccess(res, { email }, `We sent a code to ${email}.`);
  } catch (error) {
    next(error);
  }
};

exports.confirmStudentVerification = async (req, res, next) => {
  try {
    const key = `student_code:${req.user.id}`;
    const raw = await redisClient.get(key);
    const record = raw ? JSON.parse(raw) : null;
    if (!record) return sendError(res, 'That code has expired. Request a new one.', 400, 'CODE_EXPIRED', req);

    const supplied = String(req.body?.code || '').trim();
    const ok = supplied.length === record.code.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(record.code));
    if (!ok) {
      record.attempts += 1;
      if (record.attempts >= 5) await redisClient.del(key);
      else await redisClient.set(key, JSON.stringify(record), { EX: 600 });
      return sendError(res, 'That code is not correct.', 400, 'INVALID_CODE', req);
    }
    await redisClient.del(key);

    const domain = record.email.split('@')[1];
    const { rows } = await db.query(
      `UPDATE users SET
         verification_status = CASE WHEN verification_status IN ('unverified', 'verified') THEN 'student' ELSE verification_status END,
         institution = COALESCE(NULLIF(institution, ''), $2)
       WHERE id = $1
       RETURNING id, verification_status, institution`,
      [req.user.id, domain]
    );
    return sendSuccess(res, rows[0], 'Student status verified.');
  } catch (error) {
    next(error);
  }
};

// Both endpoints answer the same way whether or not the email has an account.
exports.resendVerification = async (req, res, next) => {
  try {
    await authService.resendVerification(req.body.email);
    return sendSuccess(res, { email: req.body.email }, 'If that account still needs verifying, a new code is on its way.');
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    await authService.requestPasswordReset(req.body.email);
    return sendSuccess(res, { email: req.body.email }, 'If an account uses that email, a reset code is on its way.');
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, code, new_password: newPassword } = req.body;
    await authService.resetPassword({ email, code, newPassword });
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return sendSuccess(res, null, 'Password updated. Sign in with your new password.');
  } catch (error) {
    next(error);
  }
};
