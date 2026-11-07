const jwt = require('jsonwebtoken');
const db = require('../config/db');
const redisClient = require('../config/redisClient');

/**
 * Verifies an access token and its live session. Every token we issue carries
 * a session id (sid); one without it can't be revoked, so it isn't accepted.
 * Returns the claims, or null for anything that shouldn't authenticate.
 */
const verifyAccess = async (token) => {
  const claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  if (claims.typ === 'refresh' || !claims.id || !claims.sid) return null;
  const active = await redisClient.get(`session:${claims.id}:${claims.sid}`);
  return active === null ? null : claims;
};

const authMiddleware = async (req, res, next) => {
  const token = req.cookies?.accessToken || req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No authentication token, access denied' });
  }

  try {
    const verified = await verifyAccess(token);
    if (!verified) {
      return res.status(401).json({ success: false, message: 'Session revoked or expired' });
    }
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
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

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user.role}' is not authorized`
      });
    }
    next();
  };
};

/**
 * For public endpoints that personalise their response when a viewer is signed in
 * (e.g. "is_following" on a profile). Never rejects; sets req.user only for a valid,
 * non-revoked session.
 */
const optionalAuth = async (req, res, next) => {
  const token = req.cookies?.accessToken || req.header('Authorization')?.split(' ')[1];
  if (!token) return next();
  try {
    const verified = await verifyAccess(token);
    if (!verified) return next();
    req.user = verified;
  } catch (_) {
    // Expired or invalid token on a public route: treat as anonymous.
  }
  next();
};

module.exports = { verifyAccess, authMiddleware, optionalAuth, checkVerification, checkRole };
