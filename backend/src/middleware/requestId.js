const crypto = require('crypto');

const requestIdMiddleware = (req, res, next) => {
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && /^[a-zA-Z0-9_-]{6,64}$/.test(incoming)
    ? incoming
    : `req_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

module.exports = requestIdMiddleware;
