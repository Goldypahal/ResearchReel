const crypto = require('crypto');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const redisClient = require('../config/redisClient');
const { sendOTP, sendPasswordReset } = require('../utils/emailService');
const sessionRepository = require('../repositories/sessionRepository');

const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 600);
const OTP_MAX_ATTEMPTS = 5;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

class AuthError extends Error {
  constructor(message, statusCode = 400, code = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const USER_PUBLIC_COLUMNS = `
  id, email, username, full_name, bio, profile_picture_url, verification_status,
  role, subscription_tier, email_verified, institution, website, research_interests,
  orcid_id, created_at
`;

/** Strips secrets and normalises a user row for API responses. */
const sanitizeUser = (u) => {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    full_name: u.full_name,
    bio: u.bio || null,
    avatar_url: u.profile_picture_url || null,
    profile_picture_url: u.profile_picture_url || null,
    verification_status: u.verification_status,
    role: u.role || 'user',
    subscription_tier: u.subscription_tier || 'free',
    email_verified: Boolean(u.email_verified),
    institution: u.institution || null,
    website: u.website || null,
    research_interests: u.research_interests || [],
    orcid_id: u.orcid_id || null,
    created_at: u.created_at
  };
};

const createTokenPair = async (userData, reqInfo = {}) => {
  const sid = crypto.randomUUID();
  const sessionKey = `session:${userData.id}:${sid}`;
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);

  await redisClient.set(sessionKey, JSON.stringify({ userId: userData.id, createdAt: new Date() }), { EX: REFRESH_TTL_SECONDS });

  const payload = {
    id: userData.id,
    sid,
    username: userData.username,
    verification_status: userData.verification_status,
    subscription_tier: userData.subscription_tier || 'free',
    role: userData.role || 'user'
  };

  const accessToken = jwt.sign({ ...payload, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m'
  });

  const refreshToken = jwt.sign({ ...payload, type: 'refresh', jti: crypto.randomUUID() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '30d'
  });

  await sessionRepository.createSession({
    userId: userData.id,
    sid,
    refreshToken,
    deviceName: reqInfo.deviceName || 'Web Browser',
    ipAddress: reqInfo.ipAddress || null,
    userAgent: reqInfo.userAgent || null,
    expiresAt
  });

  return { accessToken, refreshToken, sid };
};

const issueOtp = async (email) => {
  const otp = crypto.randomInt(100000, 1000000).toString();
  await redisClient.set(`otp:${email}`, JSON.stringify({ otp, attempts: 0 }), { EX: OTP_TTL_SECONDS });
  await sendOTP(email, otp);
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const emailVerificationRequired = () => process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';

const register = async ({ email, username, password, full_name, reqInfo }) => {
  email = normalizeEmail(email);
  username = String(username || '').trim().toLowerCase();

  if (!/^[a-z0-9_.]{3,30}$/.test(username)) {
    throw new AuthError('Username may only contain letters, numbers, underscores and dots (3-30 characters).', 400, 'VALIDATION_ERROR');
  }

  const existing = await db.query('SELECT id, email, username, email_verified FROM users WHERE email = $1 OR LOWER(username) = $2', [email, username]);
  const sameEmail = existing.rows.find((u) => u.email === email);

  // Let an unverified account re-register (e.g. they lost the code) by resetting it.
  if (sameEmail && !sameEmail.email_verified) {
    const usernameTaken = existing.rows.find((u) => u.id !== sameEmail.id);
    if (usernameTaken) throw new AuthError('That username is already taken.', 409, 'CONFLICT_ERROR');
    const passwordHash = await argon2.hash(password);
    await db.query(
      'UPDATE users SET username = $1, full_name = $2, password_hash = $3, updated_at = NOW() WHERE id = $4',
      [username, full_name, passwordHash, sameEmail.id]
    );
    await issueOtp(email);
    return { id: sameEmail.id, email, username, requiresVerification: true };
  }

  if (sameEmail) throw new AuthError('An account with this email already exists.', 409, 'CONFLICT_ERROR');
  if (existing.rows.length > 0) throw new AuthError('That username is already taken.', 409, 'CONFLICT_ERROR');

  const passwordHash = await argon2.hash(password);

  if (!emailVerificationRequired()) {
    const created = await db.query(
      `INSERT INTO users (email, username, full_name, password_hash, verification_status, email_verified)
       VALUES ($1, $2, $3, $4, 'verified', TRUE) RETURNING ${USER_PUBLIC_COLUMNS}`,
      [email, username, full_name, passwordHash]
    );
    const user = created.rows[0];
    const { accessToken, refreshToken } = await createTokenPair(user, reqInfo);
    return { user: sanitizeUser(user), accessToken, refreshToken, requiresVerification: false };
  }

  const newUser = await db.query(
    `INSERT INTO users (email, username, full_name, password_hash, verification_status, email_verified)
     VALUES ($1, $2, $3, $4, 'unverified', FALSE) RETURNING id, email, username`,
    [email, username, full_name, passwordHash]
  );

  await issueOtp(email);
  return { ...newUser.rows[0], requiresVerification: true };
};

const resendOtp = async (email) => {
  email = normalizeEmail(email);
  const res = await db.query('SELECT email_verified FROM users WHERE email = $1', [email]);
  // Do not reveal whether the account exists.
  if (res.rows.length && !res.rows[0].email_verified) {
    await issueOtp(email);
  }
};

const verifyOTP = async ({ email, otp, reqInfo }) => {
  email = normalizeEmail(email);
  const key = `otp:${email}`;
  const recordJson = await redisClient.get(key);
  const record = recordJson ? JSON.parse(recordJson) : null;

  if (!record) throw new AuthError('This code has expired. Request a new one.', 400, 'OTP_EXPIRED');

  if (record.otp !== String(otp).trim()) {
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await redisClient.del(key);
      throw new AuthError('Too many incorrect attempts. Request a new code.', 400, 'OTP_EXPIRED');
    }
    await redisClient.set(key, JSON.stringify(record), { EX: OTP_TTL_SECONDS });
    throw new AuthError('Incorrect verification code.', 400, 'OTP_INVALID');
  }

  await redisClient.del(key);
  const userRes = await db.query(
    `UPDATE users
       SET email_verified = TRUE,
           verification_status = CASE WHEN verification_status = 'unverified' THEN 'verified' ELSE verification_status END,
           last_active = NOW()
     WHERE email = $1
     RETURNING ${USER_PUBLIC_COLUMNS}`,
    [email]
  );
  const user = userRes.rows[0];
  if (!user) throw new AuthError('Account not found.', 404, 'NOT_FOUND');

  const { accessToken, refreshToken } = await createTokenPair(user, reqInfo);
  return { user: sanitizeUser(user), accessToken, refreshToken };
};

const login = async ({ email, password, reqInfo }) => {
  email = normalizeEmail(email);
  const userRes = await db.query(
    `SELECT ${USER_PUBLIC_COLUMNS}, password_hash, is_suspended, is_deleted FROM users WHERE email = $1`,
    [email]
  );
  const user = userRes.rows[0];
  if (!user || user.is_deleted || !user.password_hash) {
    throw new AuthError('Incorrect email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const isValidPassword = await argon2.verify(user.password_hash, password);
  if (!isValidPassword) {
    throw new AuthError('Incorrect email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (user.is_suspended) {
    throw new AuthError('This account has been suspended. Contact support.', 403, 'ACCOUNT_SUSPENDED');
  }

  if (!user.email_verified) {
    await issueOtp(email);
    const err = new AuthError('Please verify your email. We sent you a new code.', 403, 'EMAIL_NOT_VERIFIED');
    err.details = { email, requiresVerification: true };
    throw err;
  }

  await db.query('UPDATE users SET last_active = NOW() WHERE id = $1', [user.id]);
  const { accessToken, refreshToken } = await createTokenPair(user, reqInfo);
  return { user: sanitizeUser(user), accessToken, refreshToken };
};

const refreshTokens = async (token, reqInfo) => {
  if (!token) throw new AuthError('Refresh token required', 401, 'AUTHENTICATION_ERROR');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new AuthError('Session expired. Please sign in again.', 401, 'AUTHENTICATION_ERROR');
  }
  if (decoded.type && decoded.type !== 'refresh') {
    throw new AuthError('Invalid refresh token', 401, 'AUTHENTICATION_ERROR');
  }

  const { id: userId, sid } = decoded;

  const dbSession = await sessionRepository.findActiveSession(token);
  if (!dbSession) throw new AuthError('Session expired. Please sign in again.', 401, 'AUTHENTICATION_ERROR');

  if (sid) await redisClient.del(`session:${userId}:${sid}`);

  const userRes = await db.query(`SELECT ${USER_PUBLIC_COLUMNS}, is_suspended FROM users WHERE id = $1 AND (is_deleted IS NOT TRUE)`, [userId]);
  const user = userRes.rows[0];
  if (!user || user.is_suspended) {
    await sessionRepository.revokeSession(dbSession.id);
    throw new AuthError('Session expired. Please sign in again.', 401, 'AUTHENTICATION_ERROR');
  }

  // Revoke the old DB session row; createTokenPair records the new one.
  await sessionRepository.revokeSession(dbSession.id);
  const { accessToken, refreshToken } = await createTokenPair(user, reqInfo);
  return { user: sanitizeUser(user), accessToken, refreshToken };
};

const revokeSession = async (userId, sid, refreshToken) => {
  if (userId && sid) await redisClient.del(`session:${userId}:${sid}`);
  if (refreshToken) {
    const dbSession = await sessionRepository.findActiveSession(refreshToken);
    if (dbSession) await sessionRepository.revokeSession(dbSession.id);
    try {
      const decoded = jwt.decode(refreshToken);
      if (decoded?.id && decoded?.sid) await redisClient.del(`session:${decoded.id}:${decoded.sid}`);
    } catch (e) { /* ignore */ }
  }
};

const requestPasswordReset = async (email) => {
  email = normalizeEmail(email);
  const res = await db.query('SELECT id FROM users WHERE email = $1 AND (is_deleted IS NOT TRUE)', [email]);
  if (!res.rows.length) return; // Do not reveal whether the account exists.
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await redisClient.set(`pwreset:${hash}`, res.rows[0].id, { EX: 60 * 60 });
  await sendPasswordReset(email, token);
};

const resetPassword = async (token, newPassword) => {
  const hash = crypto.createHash('sha256').update(String(token || '')).digest('hex');
  const userId = await redisClient.get(`pwreset:${hash}`);
  if (!userId) throw new AuthError('This reset link is invalid or has expired.', 400, 'RESET_INVALID');
  const passwordHash = await argon2.hash(newPassword);
  await db.query('UPDATE users SET password_hash = $1, email_verified = TRUE, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);
  await redisClient.del(`pwreset:${hash}`);
  await sessionRepository.revokeAllUserSessions(userId);
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const res = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!res.rows.length) throw new AuthError('Account not found.', 404, 'NOT_FOUND');
  const ok = await argon2.verify(res.rows[0].password_hash, currentPassword);
  if (!ok) throw new AuthError('Your current password is incorrect.', 400, 'INVALID_CREDENTIALS');
  const passwordHash = await argon2.hash(newPassword);
  await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);
};

const issueSocketToken = (user) => jwt.sign(
  { id: user.id, sid: user.sid, username: user.username, role: user.role, type: 'socket' },
  process.env.JWT_SECRET,
  { expiresIn: '12h' }
);

module.exports = {
  AuthError,
  USER_PUBLIC_COLUMNS,
  sanitizeUser,
  register,
  resendOtp,
  verifyOTP,
  login,
  refreshTokens,
  revokeSession,
  requestPasswordReset,
  resetPassword,
  changePassword,
  issueSocketToken
};
