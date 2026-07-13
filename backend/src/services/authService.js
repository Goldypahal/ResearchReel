const crypto = require('crypto');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const redisClient = require('../config/redisClient');
const { sendOTP } = require('../utils/emailService');
const searchService = require('./searchService');

const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 600);

// Custom error that carries an HTTP status code so controllers can
// distinguish client errors (400/409/401) from server faults (500).
class AuthError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

const register = async ({ email, username, password, full_name }) => {
  const userExists = await db.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
  if (userExists.rows.length > 0) {
    throw new AuthError('User already exists', 409);
  }

  const passwordHash = await argon2.hash(password);
  const newUser = await db.query(
    'INSERT INTO users (email, username, full_name, password_hash, verification_status) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, verification_status',
    [email, username, full_name, passwordHash, 'unverified']
  );

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

  const otp = crypto.randomInt(100000, 999999).toString();
  await redisClient.set(`otp:${email}`, JSON.stringify({ otp }), { EX: OTP_TTL_SECONDS });
  await sendOTP(email, otp);

  return user;
};


const verifyOTP = async ({ email, otp }) => {
  const recordJson = await redisClient.get(`otp:${email}`);
  const record = recordJson ? JSON.parse(recordJson) : null;
  if (!record || record.otp !== otp) {
    throw new AuthError('Invalid or expired OTP', 400);
  }

  await db.query('UPDATE users SET verification_status = $1 WHERE email = $2', ['verified', email]);
  await redisClient.del(`otp:${email}`);

  const user = await db.query('SELECT id, email, username, verification_status, subscription_tier, role FROM users WHERE email = $1', [email]);
  const accessToken = jwt.sign(
    { id: user.rows[0].id, verification_status: user.rows[0].verification_status, subscription_tier: user.rows[0].subscription_tier || 'free', role: user.rows[0].role || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.rows[0].id, verification_status: user.rows[0].verification_status, subscription_tier: user.rows[0].subscription_tier || 'free', role: user.rows[0].role || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '30d' }
  );

  return { user: user.rows[0], accessToken, refreshToken };
};

const login = async ({ email, password }) => {
  const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  if (user.rows.length === 0) {
    throw new AuthError('Invalid credentials', 401);
  }

  const isValidPassword = await argon2.verify(user.rows[0].password_hash, password);
  if (!isValidPassword) {
    throw new AuthError('Invalid credentials', 401);
  }

  const accessToken = jwt.sign(
    { id: user.rows[0].id, verification_status: user.rows[0].verification_status, subscription_tier: user.rows[0].subscription_tier || 'free', role: user.rows[0].role || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.rows[0].id, verification_status: user.rows[0].verification_status, subscription_tier: user.rows[0].subscription_tier || 'free', role: user.rows[0].role || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '30d' }
  );

  return { user: user.rows[0], accessToken, refreshToken };
};

module.exports = {
  register,
  verifyOTP,
  login
};
