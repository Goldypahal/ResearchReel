const crypto = require('crypto');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const redisClient = require('../config/redisClient');
const { sendOTP, sendPasswordReset } = require('../utils/emailService');
const searchService = require('./searchService');

const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 600);

class AuthError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.code = statusCode === 401 ? 'AUTHENTICATION_ERROR' : statusCode === 403 ? 'AUTHORIZATION_ERROR' : statusCode === 409 ? 'CONFLICT' : statusCode === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR';
  }
}

const sessionRepository = require('../repositories/sessionRepository');

const createTokenPair = async (userData, reqInfo = {}, { sessionId = null } = {}) => {
  const sid = crypto.randomUUID();
  const sessionKey = `session:${userData.id}:${sid}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Redis cache for fast access token check
  await redisClient.set(sessionKey, JSON.stringify({ userId: userData.id, createdAt: new Date() }), { EX: 30 * 24 * 60 * 60 });

  const payload = {
    id: userData.id,
    sid,
    verification_status: userData.verification_status,
    subscription_tier: userData.subscription_tier || 'free',
    role: userData.role || 'user'
  };

  const accessToken = jwt.sign({ ...payload, typ: 'access' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m'
  });

  const refreshToken = jwt.sign({ ...payload, typ: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '30d'
  });

  // DB session row (one per device): refresh rotates it in place.
  try {
    if (sessionId) {
      await sessionRepository.rotateSession(sessionId, refreshToken, expiresAt, sid, reqInfo);
    } else {
      await sessionRepository.createSession({
        userId: userData.id,
        refreshToken,
        deviceName: reqInfo.deviceName || 'Web Browser',
        ipAddress: reqInfo.ipAddress || null,
        userAgent: reqInfo.userAgent || null,
        expiresAt,
        sid
      });
    }
  } catch (err) {
    console.error('Failed to record user session in DB:', err.message);
  }

  return { accessToken, refreshToken, sid };
};

// Never send password hashes or billing identifiers to the client.
const toPublicUser = (row) => ({
  id: row.id,
  email: row.email,
  username: row.username,
  full_name: row.full_name,
  avatar_url: row.avatar_url || row.profile_picture_url || null,
  verification_status: row.verification_status,
  subscription_tier: row.subscription_tier || 'free',
  role: row.role || 'user'
});


const MAX_CODE_ATTEMPTS = 5;

/** Stores a fresh 6-digit code under `key` and returns it. */
const issueCode = async (key, ttlSeconds = OTP_TTL_SECONDS) => {
  const code = crypto.randomInt(100000, 1000000).toString();
  await redisClient.set(key, JSON.stringify({ otp: code, attempts: 0 }), { EX: ttlSeconds });
  return code;
};

/**
 * Checks a code stored by issueCode. A wrong guess counts against the code and
 * the code is burned after MAX_CODE_ATTEMPTS, so six digits can't be brute-forced.
 */
const consumeCode = async (key, submitted) => {
  const raw = await redisClient.get(key);
  const record = raw ? JSON.parse(raw) : null;
  if (!record) return false;
  const a = Buffer.from(String(record.otp));
  const b = Buffer.from(String(submitted || ''));
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
    await redisClient.del(key);
    return true;
  }
  const attempts = (record.attempts || 0) + 1;
  if (attempts >= MAX_CODE_ATTEMPTS) {
    await redisClient.del(key);
  } else {
    const ttl = await redisClient.ttl(key);
    await redisClient.set(key, JSON.stringify({ ...record, attempts }), { EX: ttl > 0 ? ttl : OTP_TTL_SECONDS });
  }
  return false;
};

const register = async ({ email, username, password, full_name }) => {
  const userExists = await db.query('SELECT id FROM users WHERE lower(email) = lower($1) OR lower(username) = lower($2)', [email, username]);
  if (userExists.rows.length > 0) {
    throw new AuthError('User already exists', 409);
  }

  const passwordHash = await argon2.hash(password);
  let newUser;
  try {
    newUser = await db.query(
      'INSERT INTO users (email, username, full_name, password_hash, verification_status) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, verification_status',
      [email, username, full_name, passwordHash, 'unverified']
    );
  } catch (err) {
    // Two sign-ups racing for the same email/username: the unique index decides.
    if (err.code === '23505') throw new AuthError('User already exists', 409);
    throw err;
  }

  const user = newUser.rows[0];
  try {
    await searchService.indexEntity('users', user.id, {
      id: user.id,
      username: user.username,
      full_name,
      verification_status: 'unverified'
    });
  } catch (err) {
    console.error('Failed to index user in search:', err.message);
  }

  await sendOTP(email, await issueCode(`otp:${email}`));

  return user;
};

const verifyOTP = async ({ email, otp, reqInfo }) => {
  if (!(await consumeCode(`otp:${email}`, otp))) {
    throw new AuthError('That code is incorrect or has expired. Request a new one.', 400);
  }

  // Only promote accounts that are still unverified; never downgrade a student/researcher badge.
  await db.query("UPDATE users SET verification_status = 'verified' WHERE lower(email) = lower($1) AND verification_status = 'unverified'", [email]);

  const userRes = await db.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  const user = toPublicUser(userRes.rows[0]);
  const { accessToken, refreshToken } = await createTokenPair(user, reqInfo);

  return { user, accessToken, refreshToken };
};

let cachedDummyHash = null;
const dummyHash = async () => {
  if (!cachedDummyHash) cachedDummyHash = await argon2.hash(crypto.randomBytes(16).toString('hex'));
  return cachedDummyHash;
};

const login = async ({ email, password, reqInfo }) => {
  const userRes = await db.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  const row = userRes.rows[0];
  // Always run one password check so response time doesn't reveal whether an account exists.
  const hash = row && !row.is_deleted && row.password_hash ? row.password_hash : await dummyHash();
  const isValidPassword = await argon2.verify(hash, password).catch(() => false);
  if (!row || row.is_deleted || !isValidPassword) {
    throw new AuthError('Invalid credentials', 401);
  }

  // Accounts that never confirmed their email get a fresh code instead of a session.
  if (row.verification_status === 'unverified') {
    await sendOTP(email, await issueCode(`otp:${email}`));
    return { requiresVerification: true, user: null };
  }

  const user = toPublicUser(row);
  const { accessToken, refreshToken } = await createTokenPair(user, reqInfo);
  return { user, accessToken, refreshToken };
};

const REFRESH_REUSE_GRACE_SECONDS = 30;

const refreshTokens = async (token, reqInfo) => {
  if (!token) {
    throw new AuthError('Refresh token required', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    throw new AuthError('Invalid or expired refresh token', 401);
  }
  if (decoded.typ === 'access') {
    throw new AuthError('Invalid or expired refresh token', 401);
  }

  const { id: userId, sid } = decoded;

  const dbSession = await sessionRepository.findActiveSession(token);
  if (!dbSession) {
    // An already-rotated token being replayed: someone else has a copy.
    // Two tabs refreshing at once look the same for a moment, so allow a short grace window.
    const reused = await sessionRepository.findByPreviousToken(token);
    if (reused && reused.seconds_since_rotation > REFRESH_REUSE_GRACE_SECONDS) {
      await sessionRepository.revokeSession(reused.id);
      await dropRedisSessions(reused.user_id, [reused.sid]);
      console.warn(`[auth] refresh token reuse for user ${reused.user_id}; session ${reused.id} revoked`);
    }
    throw new AuthError('Session revoked or expired', 401);
  }

  if (sid) {
    const sessionData = await redisClient.get(`session:${userId}:${sid}`);
    if (!sessionData) {
      throw new AuthError('Session revoked or expired', 401);
    }
    await redisClient.del(`session:${userId}:${sid}`);
  }

  const userRes = await db.query(
    'SELECT id, email, username, verification_status, subscription_tier, role FROM users WHERE id = $1 AND (is_deleted IS NOT TRUE)',
    [userId]
  );
  if (userRes.rows.length === 0) {
    await sessionRepository.revokeSession(dbSession.id);
    throw new AuthError('Session revoked or expired', 401);
  }

  const user = userRes.rows[0];
  const { accessToken, refreshToken: newRefreshToken } = await createTokenPair(user, reqInfo, { sessionId: dbSession.id });

  return { user, accessToken, refreshToken: newRefreshToken };
};

/**
 * Signs out one device: the session named by the access token's sid and/or
 * the one holding this refresh token. Never touches the user's other devices.
 */
const revokeSession = async (userId, sid, refreshToken) => {
  const sids = new Set();
  if (userId && sid) {
    sids.add(sid);
    const owned = await sessionRepository.revokeBySid(userId, sid);
    if (owned) sids.add(owned);
  }
  if (refreshToken) {
    const dbSession = await sessionRepository.findActiveSession(refreshToken);
    if (dbSession) {
      await sessionRepository.revokeSession(dbSession.id);
      if (dbSession.sid) sids.add(dbSession.sid);
      await dropRedisSessions(dbSession.user_id, [...sids]);
      return;
    }
  }
  if (userId) await dropRedisSessions(userId, [...sids]);
};

const dropRedisSessions = async (userId, sids) => {
  await Promise.all(sids.filter(Boolean).map((sid) => redisClient.del(`session:${userId}:${sid}`).catch(() => {})));
};

/** Signed-in devices for the account settings page. */
const listSessions = async (userId, currentSid) => {
  const rows = await sessionRepository.listActive(userId);
  return rows.map(({ sid, ...r }) => ({ ...r, current: Boolean(currentSid && sid === currentSid) }));
};

const revokeSessionById = async (userId, sessionId) => {
  const sid = await sessionRepository.revokeOwned(userId, sessionId);
  if (sid === undefined) throw new AuthError('Session not found', 404);
  await dropRedisSessions(userId, [sid]);
};

const revokeOtherSessions = async (userId, currentSid) => {
  const sids = await sessionRepository.revokeOthers(userId, currentSid);
  await dropRedisSessions(userId, sids);
  return sids.length;
};

const verifyPassword = async (userId, password) => {
  const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1 AND (is_deleted IS NULL OR is_deleted = FALSE)', [userId]);
  if (!rows[0] || !password || !(await argon2.verify(rows[0].password_hash, password))) {
    throw new AuthError('Your current password is incorrect.', 400);
  }
};

/** Changes the password and signs out every other device. */
const changePassword = async (userId, currentPassword, newPassword, currentSid) => {
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 200) {
    throw new AuthError('New password must be at least 8 characters.', 400);
  }
  await verifyPassword(userId, currentPassword);
  if (currentPassword === newPassword) throw new AuthError('Choose a password you have not used here.', 400);
  await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [await argon2.hash(newPassword), userId]);
  return revokeOtherSessions(userId, currentSid);
};

/**
 * Deletes an account: content stays attributed to a tombstone so threads make
 * sense, but personal fields are wiped, the email/username are freed, and all
 * sessions end.
 */
const deleteAccount = async (userId, password) => {
  await verifyPassword(userId, password);
  const tomb = `deleted_${crypto.randomBytes(6).toString('hex')}`;
  await db.query(
    `UPDATE users SET is_deleted = TRUE, email = $2, username = $3, full_name = 'Deleted user', bio = NULL,
       avatar_url = NULL, institution = NULL, research_interests = '{}', orcid_id = NULL,
       password_hash = $4, updated_at = NOW()
     WHERE id = $1`,
    [userId, `${tomb}@deleted.invalid`, tomb, await argon2.hash(crypto.randomBytes(32).toString('hex'))]
  );
  await db.query('UPDATE posts SET deleted_at = NOW() WHERE author_id = $1 AND deleted_at IS NULL', [userId]);
  await db.query('UPDATE documents SET deleted_at = NOW() WHERE uploader_id = $1 AND deleted_at IS NULL', [userId]);
  await db.query('DELETE FROM follows WHERE follower_id = $1 OR following_id = $1', [userId]);
  const sids = await sessionRepository.revokeOthers(userId, null);
  await dropRedisSessions(userId, sids);
  try { await searchService.removeEntity('users', userId); } catch { /* search optional */ }
};


/** Re-sends the sign-up code. Silent for unknown or already-verified emails so it can't enumerate accounts. */
const resendVerification = async (email) => {
  const res = await db.query('SELECT verification_status, is_deleted FROM users WHERE lower(email) = lower($1)', [email]);
  const row = res.rows[0];
  if (!row || row.is_deleted || row.verification_status !== 'unverified') return;
  await sendOTP(email, await issueCode(`otp:${email}`));
};

const RESET_TTL_SECONDS = 15 * 60;

/** Emails a password-reset code. Always succeeds from the caller's view (no account enumeration). */
const requestPasswordReset = async (email) => {
  const res = await db.query('SELECT id, is_deleted FROM users WHERE lower(email) = lower($1)', [email]);
  const row = res.rows[0];
  if (!row || row.is_deleted) return;
  await sendPasswordReset(email, await issueCode(`pwreset:${email}`, RESET_TTL_SECONDS));
};

/** Sets a new password from a reset code and signs out every existing session. */
const resetPassword = async ({ email, code, newPassword }) => {
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 200) {
    throw new AuthError('New password must be at least 8 characters.', 400);
  }
  if (!(await consumeCode(`pwreset:${email}`, code))) {
    throw new AuthError('That reset code is incorrect or has expired. Request a new one.', 400);
  }
  const res = await db.query('SELECT id FROM users WHERE lower(email) = lower($1) AND (is_deleted IS NOT TRUE)', [email]);
  const row = res.rows[0];
  if (!row) throw new AuthError('That reset code is incorrect or has expired. Request a new one.', 400);
  // A reset proves control of the inbox, so it also confirms the email.
  await db.query(
    "UPDATE users SET password_hash = $1, verification_status = CASE WHEN verification_status = 'unverified' THEN 'verified' ELSE verification_status END, updated_at = NOW() WHERE id = $2",
    [await argon2.hash(newPassword), row.id]
  );
  const sids = await sessionRepository.revokeOthers(row.id, null);
  await dropRedisSessions(row.id, sids);
};

module.exports = {
  resendVerification,
  requestPasswordReset,
  resetPassword,
  register,
  listSessions,
  revokeSessionById,
  revokeOtherSessions,
  changePassword,
  deleteAccount,
  verifyOTP,
  login,
  refreshTokens,
  revokeSession
};


