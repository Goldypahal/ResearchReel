const express = require('express');
const request = require('supertest');
const rateLimiter = require('../src/middleware/rateLimiter');
const redisClient = require('../src/config/redisClient');

describe('Rate Limiter Middleware', () => {
  let app;
  let inMemoryStore = new Map();

  beforeAll(async () => {
    // Explicitly enable rate limiting for this test suite
    process.env.DISABLE_RATE_LIMIT = 'false';

    // Wait for real Redis connection if Redis is configured (e.g. in CI)
    if (process.env.REDIS_URL || process.env.TEST_REDIS_URL) {
      for (let i = 0; i < 50 && !redisClient.client.isReady; i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // If real Redis is not connected, provide an in-memory mock for client.multi
    if (!redisClient.client.isReady) {
      redisClient.client.isReady = true;
      redisClient.client.multi = () => {
        let opKey = '';
        let expireSecs = 60;
        const chain = {
          incr: (key) => {
            opKey = key;
            return chain;
          },
          expire: (key, secs) => {
            expireSecs = secs;
            return chain;
          },
          exec: async () => {
            const count = (inMemoryStore.get(opKey) || 0) + 1;
            inMemoryStore.set(opKey, count);
            return [count, 1];
          }
        };
        return chain;
      };
    }
  });

  beforeEach(async () => {
    inMemoryStore.clear();
    if (redisClient.client.isReady && typeof redisClient.client.flushDb === 'function') {
      try {
        await redisClient.client.flushDb();
      } catch (e) { /* ignore */ }
    }
    app = express();
    app.use(express.json());
  });

  afterAll(async () => {
    // Reset back to disabled for standard test suites
    process.env.DISABLE_RATE_LIMIT = 'true';
    if (redisClient.client.isReady && typeof redisClient.client.quit === 'function') {
      try {
        await redisClient.client.flushDb();
      } catch (e) { /* ignore */ }
    }
  });

  it('allows requests up to limit N and blocks request N+1 with 429', async () => {
    const LIMIT = 5;
    app.get('/test-limit', rateLimiter(LIMIT, 60), (req, res) => {
      res.json({ success: true, count: 'ok' });
    });

    // Make N successful requests
    for (let i = 1; i <= LIMIT; i++) {
      const res = await request(app).get('/test-limit');
      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe(String(LIMIT));
      expect(res.headers['x-ratelimit-remaining']).toBe(String(LIMIT - i));
      expect(res.body.success).toBe(true);
    }

    // Request N+1 must be rejected with 429
    const blockedRes = await request(app).get('/test-limit');
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.success).toBe(false);
    expect(blockedRes.body.message).toBe('Too many requests. Please try again later.');
    expect(blockedRes.headers['x-ratelimit-remaining']).toBe('0');
  });

  it('enforces route-specific login rate limit (20 tries in 15 minutes)', async () => {
    const LOGIN_LIMIT = 20;
    app.post('/api/v1/auth/login', rateLimiter(LOGIN_LIMIT, 900), (req, res) => {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    });

    // Send 20 attempts
    for (let i = 1; i <= LOGIN_LIMIT; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.headers['x-ratelimit-remaining']).toBe(String(LOGIN_LIMIT - i));
    }

    // 21st attempt must be blocked by rate limiter
    const blockedRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.success).toBe(false);
    expect(blockedRes.body.message).toBe('Too many requests. Please try again later.');
  });

  it('bypasses rate limiting when DISABLE_RATE_LIMIT=true', async () => {
    process.env.DISABLE_RATE_LIMIT = 'true';
    app.get('/test-disabled', rateLimiter(2, 60), (req, res) => {
      res.json({ success: true });
    });

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/test-disabled');
      expect(res.status).toBe(200);
    }

    process.env.DISABLE_RATE_LIMIT = 'false';
  });

  it('separates rate limits for authenticated users by user id', async () => {
    const LIMIT = 2;
    app.get('/user-resource', (req, res, next) => {
      // Simulate auth middleware setting req.user
      req.user = { id: req.headers['x-user-id'] };
      next();
    }, rateLimiter(LIMIT, 60), (req, res) => {
      res.json({ success: true });
    });

    // User A hits limit
    await request(app).get('/user-resource').set('x-user-id', 'user-A');
    await request(app).get('/user-resource').set('x-user-id', 'user-A');
    const userABlocked = await request(app).get('/user-resource').set('x-user-id', 'user-A');
    expect(userABlocked.status).toBe(429);

    // User B is unaffected
    const userB = await request(app).get('/user-resource').set('x-user-id', 'user-B');
    expect(userB.status).toBe(200);
  });
});
