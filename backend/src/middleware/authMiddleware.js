const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.cookies?.accessToken || req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No authentication token, access denied' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
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

module.exports = { authMiddleware, checkVerification };
