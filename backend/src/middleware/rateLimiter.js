const redisClient = require('../config/redisClient');

/**
 * Redis-based Rate Limiter middleware
 * @param {number} limit - Maximum number of requests allowed in the window
 * @param {number} windowSecs - Window size in seconds
 */
const rateLimiter = (limit = 100, windowSecs = 60) => {
  return async (req, res, next) => {
    // Skip rate limiting during testing to prevent tests from failing
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    // Per user when signed in (route limiters run after auth), otherwise per IP.
    // Use the full path so routers that each define POST "/" don't share a counter.
    const who = req.user?.id ? `u:${req.user.id}` : `ip:${req.ip || req.socket.remoteAddress}`;
    const key = `rate:${who}:${req.method}:${req.baseUrl}${req.path}`;

    try {
      const client = redisClient.client;
      // Atomically increment the request count for this IP & Path
      const current = await client.incr(key);

      if (current === 1) {
        // First request in this window, set expiration
        await client.expire(key, windowSecs);
      }

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));

      if (current > limit) {
        console.warn(`[Rate Limit Exceeded] IP: ${ip}, Path: ${req.path}`);
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.'
        });
      }

      next();
    } catch (err) {
      console.error('[RateLimiter Error]', err);
      // Fail open under Redis connectivity dropouts to preserve user experience
      next();
    }
  };
};

module.exports = rateLimiter;
