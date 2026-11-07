/** Rate limits with real Redis: per account, per IP, per email, and by action rather than URL. */
const { request, app, db, redis, connect, close, signedInUser, uid } = require('./helpers');

beforeAll(connect);
afterAll(close);

const enable = () => { process.env.DISABLE_RATE_LIMITS = 'false'; };
const disable = () => { process.env.DISABLE_RATE_LIMITS = 'true'; };

const clearBuckets = async () => {
  const keys = await redis.client.keys('rate:*');
  if (keys.length) await redis.client.del(keys);
};

describe('rate limits (real Redis)', () => {
  let user;
  let other;
  let conversationId;

  beforeAll(async () => {
    user = await signedInUser();
    other = await signedInUser();
    conversationId = (await user.agent.post('/api/v1/messages/conversations').send({ username: other.username })).body.data.id;
  });

  beforeEach(async () => { await clearBuckets(); enable(); });
  afterEach(disable);

  it('limits messages per account and says when to retry', async () => {
    let last;
    for (let i = 0; i < 31; i += 1) {
      last = await user.agent.post('/api/v1/messages/send').send({ conversationId, content: `msg ${i}` });
    }
    expect(last.status).toBe(429);
    expect(last.body.code).toBe('RATE_LIMITED');
    expect(Number(last.headers['retry-after'])).toBeGreaterThan(0);
    // The other participant has their own allowance.
    expect((await other.agent.post('/api/v1/messages/send').send({ conversationId, content: 'hi' })).status).toBe(201);
  });

  it('counts comments on different posts against the same allowance', async () => {
    const posts = [];
    for (let i = 0; i < 21; i += 1) {
      const { rows } = await db.query("INSERT INTO posts (author_id, content_type, caption) VALUES ($1, 'text', $2) RETURNING id", [other.id, `p${i}`]);
      posts.push(rows[0].id);
    }
    const statuses = [];
    for (const id of posts) {
      statuses.push((await user.agent.post(`/api/v1/posts/${id}/comments`).send({ content: 'Nice work' })).status);
    }
    expect(statuses.slice(0, 20).every((s) => s === 201)).toBe(true);
    expect(statuses[20]).toBe(429);
  });

  it('limits sign-in attempts per email even across IPs', async () => {
    const email = `nobody_${uid()}@example.edu`;
    const statuses = [];
    for (let i = 0; i < 11; i += 1) {
      const res = await request(app).post('/api/v1/auth/login')
        .set('X-Forwarded-For', `10.0.${i}.1`)
        .send({ email, password: 'wrong-password-123' });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401 || s === 400)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it('limits search per account', async () => {
    let last;
    for (let i = 0; i < 46; i += 1) last = await user.agent.get('/api/v1/search/documents').query({ q: `q${i}` });
    expect(last.status).toBe(429);
  });

  it('fails open if Redis is unavailable', async () => {
    const original = redis.client.multi;
    redis.client.multi = () => { throw new Error('connection lost'); };
    try {
      expect((await user.agent.get('/api/v1/search/documents').query({ q: 'x' })).status).toBe(200);
    } finally {
      redis.client.multi = original;
    }
  });
});
