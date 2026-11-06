const jwt = require('jsonwebtoken');
const redisClient = require('../config/redisClient');

const extractToken = (req) => {
  const header = req.header('Authorization');
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.accessToken || null;
};

/**
 * Verifies a JWT access token and that its session has not been revoked.
 * Returns the decoded payload or throws.
 */
const verifyAccessToken = async (token) => {
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  if (verified.type && verified.type !== 'access') {
    throw new Error('Only access tokens can be used for API access');
  }
  if (verified.sid && verified.id) {
    const activeSession = await redisClient.get(`session:${verified.id}:${verified.sid}`);
    if (activeSession === null) {
      throw new Error('Session revoked or expired');
    }
  }
  return verified;
};

const authMiddleware = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: { code: 'AUTHENTICATION_ERROR', message: 'Authentication required' }
    });
  }

  try {
    req.user = await verifyAccessToken(token);
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired session',
      error: { code: 'AUTHENTICATION_ERROR', message: 'Invalid or expired session' }
    });
  }
};

/**
 * Attaches req.user when a valid token is present, but never rejects the request.
 * Used for public endpoints that personalise their response for signed-in users.
 */
const optionalAuth = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.user = await verifyAccessToken(token);
  } catch (err) {
    req.user = undefined;
  }
  next();
};

const checkVerification = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.verification_status)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Verification status '${req.user.verification_status}' doesn't meet requirements`
      });
    }
    next();
  };
};

/** Checks the user's *current* role from the database (so demotions apply immediately). */
const checkRole = (roles) => {
  return async (req, res, next) => {
    if (req.user) {
      try {
        const db = require('../config/db');
        const r = await db.query('SELECT role, is_suspended FROM users WHERE id = $1', [req.user.id]);
        req.user.role = r.rows[0] && !r.rows[0].is_suspended ? r.rows[0].role : null;
      } catch (e) {
        return next(e);
      }
    }
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
        error: { code: 'AUTHORIZATION_ERROR', message: 'You do not have permission to perform this action' }
      });
    }
    next();
  };
};

module.exports = { authMiddleware, optionalAuth, checkVerification, checkRole, verifyAccessToken, extractToken };
