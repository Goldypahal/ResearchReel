const redisClient = require('../config/redisClient');

/**
 * Redis fixed-window rate limiting.
 *
 *   rateLimiter(limit, windowSecs)        per client IP, one bucket per route
 *   rateLimiter.action('send-message', {  named bucket shared by every URL
 *     ip: 60, user: 30, window: 60 })     that performs the action; `user`
 *                                         applies once authMiddleware has run,
 *     key: (req) => req.body.email        `key` adds a bucket per value
 *                                         (e.g. per email on sign-in)
 *
 * Buckets are keyed by the route pattern (or the action name), never the raw
 * URL, so spreading requests across ids (/posts/<id>/comments) doesn't get a
 * fresh allowance per id.
 */

/**
 * Client IPs exempt from rate limits (comma separated), e.g. an internal
 * health monitor or the CI browser-test runner. Empty by default.
 */
const ALLOWLIST = new Set(
  (process.env.RATE_LIMIT_ALLOWLIST || '').split(',').map((s) => s.trim()).filter(Boolean)
);

/** Test suites turn limits off except where a test switches them back on. */
const disabled = () => process.env.DISABLE_RATE_LIMITS === 'true';

const clientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

/** Returns the request count in the current window for `key`. */
const hit = async (key, windowSecs) => {
  const client = redisClient.client;
  const results = await client.multi().incr(key).expire(key, windowSecs, 'NX').ttl(key).exec();
  return { count: Number(results[0]), ttl: Math.max(1, Number(results[2]) || windowSecs) };
};

const tooMany = (res, retryAfter, scope) => {
  res.setHeader('Retry-After', String(retryAfter));
  return res.status(429).json({
    success: false,
    message: scope === 'account'
      ? 'You are doing that too often. Please wait a little and try again.'
      : 'Too many requests. Please try again later.',
    code: 'RATE_LIMITED',
    retry_after: retryAfter,
  });
};

const build = ({ bucket, ip, user, key, window: windowSecs }) => async (req, res, next) => {
  if (disabled()) return next();
  const addr = clientIp(req);
  if (ALLOWLIST.has(addr)) return next();
  const name = bucket || `${req.baseUrl}${req.route ? req.route.path : req.path}`;

  const checks = [];
  if (ip) checks.push({ k: `rate:${name}:ip:${addr}`, limit: ip, scope: 'ip' });
  if (user && req.user?.id) checks.push({ k: `rate:${name}:user:${req.user.id}`, limit: user, scope: 'account' });
  if (key && ip) {
    const value = key(req);
    if (value) checks.push({ k: `rate:${name}:key:${String(value).toLowerCase().slice(0, 200)}`, limit: ip, scope: 'account' });
  }

  try {
    for (const check of checks) {
      const { count, ttl } = await hit(check.k, windowSecs);
      if (check.scope === 'ip') {
        res.setHeader('X-RateLimit-Limit', check.limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, check.limit - count));
      }
      if (count > check.limit) {
        console.warn(`[rate-limit] ${check.scope} ${name} exceeded (${addr}${req.user ? ` user ${req.user.id}` : ''})`);
        return tooMany(res, ttl, check.scope);
      }
    }
    return next();
  } catch (err) {
    // Fail open if Redis drops out: availability beats strict limits here.
    console.error('[rate-limit] Redis error, allowing request:', err.message);
    return next();
  }
};

const rateLimiter = (limit = 100, windowSecs = 60) => build({ ip: limit, window: windowSecs });

rateLimiter.action = (bucket, { ip, user, key, window = 60 }) => build({ bucket, ip, user, key, window });

/** One shared allowance per IP for the whole API, as a backstop. */
rateLimiter.global = (limit, windowSecs) => build({ bucket: 'api', ip: limit, window: windowSecs });

module.exports = rateLimiter;
