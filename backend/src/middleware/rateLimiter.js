const redisClient = require('../config/redisClient');
const logger = require('../utils/logger');

/**
 * Redis-based Rate Limiter middleware
 * @param {number} limit - Maximum number of requests allowed in the window
 * @param {number} windowSecs - Window size in seconds
 */
const rateLimiter = (limit = 100, windowSecs = 60) => {
  return async (req, res, next) => {
    // Skip rate limiting when explicitly disabled (e.g. standard integration test suites)
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }

    // Per user when signed in (route limiters run after auth), otherwise per IP.
    // Use the full path so routers that each define POST "/" don't share a counter.
    const who = req.user?.id ? `u:${req.user.id}` : `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
    const key = `rate:${who}:${req.method}:${req.baseUrl || ''}${req.path || ''}`;

    try {
      const client = redisClient.client;
      if (!client || !client.isReady) {
        // Fail open if Redis is not connected
        return next();
      }

      // Execute INCR + EXPIRE atomically in a MULTI transaction so a crash cannot leave an unexpiring key
      let results;
      try {
        results = await client.multi()
          .incr(key)
          .expire(key, windowSecs, 'NX')
          .exec();
      } catch (nxErr) {
        // Fallback if Redis server does not support 'NX' flag on EXPIRE
        results = await client.multi()
          .incr(key)
          .expire(key, windowSecs)
          .exec();
      }

      const current = Array.isArray(results) ? Number(results[0]) : 1;

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));

      if (current > limit) {
        logger.warn(`[Rate Limit Exceeded] Who: ${who}, Path: ${req.path}`);
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.'
        });
      }

      next();
    } catch (err) {
      logger.error('[RateLimiter Error]', err);
      // Fail open under Redis connectivity dropouts to preserve user experience
      next();
    }
  };
};

module.exports = rateLimiter;
