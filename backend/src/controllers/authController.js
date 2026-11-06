const authService = require('../services/authService');
const db = require('../config/db');
const sessionRepository = require('../repositories/sessionRepository');
const { sendSuccess, sendError } = require('../utils/response');

const ACCESS_COOKIE_MS = 15 * 60 * 1000;
const REFRESH_COOKIE_MS = 30 * 24 * 60 * 60 * 1000;

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAMESITE || 'lax',
  path: '/',
  maxAge
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, cookieOptions(ACCESS_COOKIE_MS));
  res.cookie('refreshToken', refreshToken, cookieOptions(REFRESH_COOKIE_MS));
};

const clearAuthCookies = (res) => {
  const opts = { ...cookieOptions(0) };
  delete opts.maxAge;
  res.clearCookie('accessToken', opts);
  res.clearCookie('refreshToken', opts);
};

const extractReqInfo = (req) => {
  const ua = req.headers['user-agent'] || '';
  let deviceName = 'Web Browser';
  if (/iPhone|iPad/i.test(ua)) deviceName = 'iOS';
  else if (/Android/i.test(ua)) deviceName = 'Android';
  else if (/Mac OS X/i.test(ua)) deviceName = 'Mac';
  else if (/Windows/i.test(ua)) deviceName = 'Windows';
  else if (/Linux/i.test(ua)) deviceName = 'Linux';
  return { ipAddress: req.ip || null, userAgent: ua || null, deviceName };
};

const handleAuthError = (error, req, res, next) => {
  if (error instanceof authService.AuthError) {
    const body = {
      success: false,
      message: error.message,
      error: { code: error.code, message: error.message, ...(error.details || {}) },
      requestId: req.id
    };
    return res.status(error.statusCode).json(body);
  }
  return next(error);
};

exports.config = (req, res) => sendSuccess(res, {
  requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== 'false'
}, 'Auth configuration.');

exports.register = async (req, res, next) => {
  try {
    const { email, username, password, full_name } = req.body;
    const result = await authService.register({ email, username, password, full_name, reqInfo: extractReqInfo(req) });

    if (result.requiresVerification === false) {
      setAuthCookies(res, result.accessToken, result.refreshToken);
      return sendSuccess(res, { user: result.user, token: result.accessToken, requiresVerification: false }, 'Account created.', 201);
    }
    return sendSuccess(res, { email: result.email, requiresVerification: true }, 'Verification code sent.', 201);
  } catch (error) {
    handleAuthError(error, req, res, next);
  }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return sendError(res, 'Email is required.', 400, 'VALIDATION_ERROR', req);
    await authService.resendOtp(email);
    return sendSuccess(res, {}, 'If that account needs verification, a new code has been sent.');
  } catch (error) {
    handleAuthError(error, req, res, next);
  }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const { user, accessToken, refreshToken } = await authService.verifyOTP({ email, otp, reqInfo: extractReqInfo(req) });
    setAuthCookies(res, accessToken, refreshToken);
    return sendSuccess(res, { user, token: accessToken }, 'Email verified.');
  } catch (error) {
    handleAuthError(error, req, res, next);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login({ email, password, reqInfo: extractReqInfo(req) });
    setAuthCookies(res, accessToken, refreshToken);
    return sendSuccess(res, { user, token: accessToken }, 'Login successful.');
  } catch (error) {
    handleAuthError(error, req, res, next);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (req.user || refreshToken) {
      await authService.revokeSession(req.user?.id, req.user?.sid, refreshToken);
    }
    clearAuthCookies(res);
    return sendSuccess(res, {}, 'Logged out successfully.');
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    const { user, accessToken, refreshToken } = await authService.refreshTokens(token, extractReqInfo(req));
    setAuthCookies(res, accessToken, refreshToken);
    return sendSuccess(res, { user, token: accessToken }, 'Session refreshed.');
  } catch (error) {
    if (error instanceof authService.AuthError) clearAuthCookies(res);
    handleAuthError(error, req, res, next);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return sendError(res, 'Email is required.', 400, 'VALIDATION_ERROR', req);
    await authService.requestPasswordReset(email);
    return sendSuccess(res, {}, 'If an account exists for that email, a reset link has been sent.');
  } catch (error) {
    handleAuthError(error, req, res, next);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    clearAuthCookies(res);
    return sendSuccess(res, {}, 'Password updated. You can now sign in.');
  } catch (error) {
    handleAuthError(error, req, res, next);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    await authService.changePassword(req.user.id, current_password, new_password);
    return sendSuccess(res, {}, 'Password changed.');
  } catch (error) {
    handleAuthError(error, req, res, next);
  }
};

exports.listSessions = async (req, res, next) => {
  try {
    const sessions = await sessionRepository.listActiveSessions(req.user.id);
    return sendSuccess(res, sessions.map((s) => ({
      id: s.id,
      device_name: s.device_name,
      ip_address: s.ip_address,
      created_at: s.created_at,
      last_used_at: s.last_used_at,
      current: s.sid === req.user.sid
    })), 'Active sessions.');
  } catch (error) {
    next(error);
  }
};

exports.revokeSession = async (req, res, next) => {
  try {
    const ok = await sessionRepository.revokeUserSession(req.user.id, req.params.id);
    if (!ok) return sendError(res, 'Session not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, { id: req.params.id }, 'Session signed out.');
  } catch (error) {
    next(error);
  }
};

exports.uploadToken = async (req, res) => sendSuccess(res, { token: authService.issueUploadToken(req.user), expires_in: 900 }, 'Upload token issued.');

exports.socketToken = async (req, res) => sendSuccess(res, { token: authService.issueSocketToken(req.user) }, 'Socket token issued.');

// Researcher verification: link an ORCID iD (format-validated, checksum verified).
const validOrcid = (id) => {
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(id)) return false;
  const digits = id.replace(/-/g, '');
  let total = 0;
  for (let i = 0; i < 15; i++) total = (total + parseInt(digits[i], 10)) * 2;
  const result = (12 - (total % 11)) % 11;
  const check = result === 10 ? 'X' : String(result);
  return check === digits[15];
};

exports.orcidCallback = async (req, res, next) => {
  try {
    const orcid = String(req.body.orcid_id || '').trim().toUpperCase();
    if (!validOrcid(orcid)) {
      return sendError(res, 'Enter a valid ORCID iD (e.g. 0000-0002-1825-0097).', 400, 'VALIDATION_ERROR', req);
    }
    const taken = await db.query('SELECT 1 FROM users WHERE orcid_id = $1 AND id <> $2', [orcid, req.user.id]);
    if (taken.rows.length) return sendError(res, 'That ORCID iD is linked to another account.', 409, 'CONFLICT_ERROR', req);
    await db.query(`UPDATE users SET orcid_id = $1, verification_status = 'scholar', updated_at = NOW() WHERE id = $2`, [orcid, req.user.id]);
    return sendSuccess(res, { orcid_id: orcid, verification_status: 'scholar' }, 'ORCID linked. You are now verified as a scholar.');
  } catch (error) {
    next(error);
  }
};

exports.studentVerification = async (req, res, next) => {
  try {
    const university = String(req.body.university || '').trim();
    if (!university) return sendError(res, 'University name is required.', 400, 'VALIDATION_ERROR', req);
    await db.query(
      `UPDATE users SET institution = COALESCE(NULLIF(institution, ''), $1), verification_status = 'student', updated_at = NOW()
        WHERE id = $2 AND verification_status IN ('unverified', 'verified')`,
      [university, req.user.id]
    );
    return sendSuccess(res, { verification_status: 'student' }, 'Student status recorded.');
  } catch (error) {
    next(error);
  }
};
