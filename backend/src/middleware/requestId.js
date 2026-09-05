const crypto = require('crypto');

const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `req_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

module.exports = requestIdMiddleware;
