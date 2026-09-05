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
    if (verified.sid && verified.id) {
      const activeSession = await redisClient.get(`session:${verified.id}:${verified.sid}`);
      if (activeSession === null && process.env.NODE_ENV !== 'test') {
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

module.exports = { authMiddleware, checkVerification, checkRole };
