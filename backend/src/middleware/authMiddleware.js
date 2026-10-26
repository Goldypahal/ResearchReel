const jwt = require('jsonwebtoken');
const db = require('../config/db');
const redisClient = require('../config/redisClient');

const authMiddleware = async (req, res, next) => {
  const token = req.cookies?.accessToken || req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No authentication token, access denied' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    // A refresh token must never authorise an API call.
    if (verified.typ === 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    if (verified.sid && verified.id) {
      const activeSession = await redisClient.get(`session:${verified.id}:${verified.sid}`);
      if (activeSession === null) {
        return res.status(401).json({ success: false, message: 'Session revoked or expired' });
      }
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
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (verified.typ === 'refresh') return next();
    if (verified.sid && verified.id) {
      const activeSession = await redisClient.get(`session:${verified.id}:${verified.sid}`);
      if (activeSession === null) return next();
    }
    req.user = verified;
  } catch (_) {
    // Expired or invalid token on a public route: treat as anonymous.
  }
  next();
};

module.exports = { authMiddleware, optionalAuth, checkVerification, checkRole };
