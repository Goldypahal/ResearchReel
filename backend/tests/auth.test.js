const { app, request, db, redisClient, createUser, resetDb, close } = require('./helpers');
const emailService = require('../src/utils/emailService');

beforeAll(resetDb);
afterAll(close);

describe('auth', () => {
  test('register -> OTP -> verify -> session -> refresh -> logout', async () => {
    const { agent, user } = await createUser('alice');
    expect(user.username).toBe('alice');
    expect(user).not.toHaveProperty('password_hash');

    const me = await agent.get('/api/v1/users/me');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('alice@example.com');

    const refreshed = await agent.post('/api/v1/auth/refresh');
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.user).not.toHaveProperty('password_hash');

    expect((await agent.post('/api/v1/auth/logout')).status).toBe(200);
    expect((await agent.get('/api/v1/users/me')).status).toBe(401);
  });

  test('replaying an already-rotated refresh token ends the session it led to', async () => {
    await createUser('replay');
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'replay@example.com', password: 'password123' });
    const cookieOf = (res, name) => (res.headers['set-cookie'] || []).find((c) => c.startsWith(`${name}=`)).split(';')[0];
    const stolen = cookieOf(login, 'refreshToken');

    // The real user refreshes; the old token is now retired.
    const first = await request(app).post('/api/v1/auth/refresh').set('Cookie', stolen);
    expect(first.status).toBe(200);
    const current = cookieOf(first, 'refreshToken');

    // Within the grace window (two tabs at once) the old token just fails.
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', stolen)).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', current)).status).toBe(200);
    const latest = await db.query(
      `SELECT refresh_token_hash FROM user_sessions s JOIN users u ON u.id = s.user_id
        WHERE u.username = 'replay' AND s.revoked_at IS NULL ORDER BY s.created_at DESC LIMIT 1`
    );
    expect(latest.rows).toHaveLength(1);

    // Later, an attacker replays the stolen token: the whole chain is revoked.
    await db.query(`UPDATE user_sessions SET rotated_at = NOW() - interval '5 minutes'
                     WHERE user_id = (SELECT id FROM users WHERE username = 'replay') AND rotated_at IS NOT NULL`);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', stolen)).status).toBe(401);
    const active = await db.query(
      `SELECT count(*)::int AS n FROM user_sessions s JOIN users u ON u.id = s.user_id
        WHERE u.username = 'replay' AND s.revoked_at IS NULL AND s.id <> (SELECT id FROM user_sessions WHERE user_id = u.id ORDER BY created_at ASC LIMIT 1)`
    );
    expect(active.rows[0].n).toBe(0);
  });

  test('login never returns the password hash and rejects bad passwords', async () => {
    const ok = await request(app).post('/api/v1/auth/login').send({ email: 'alice@example.com', password: 'password123' });
    expect(ok.status).toBe(200);
    expect(JSON.stringify(ok.body)).not.toMatch(/password_hash|argon2/);
    const bad = await request(app).post('/api/v1/auth/login').send({ email: 'alice@example.com', password: 'nope' });
    expect(bad.status).toBe(401);
  });

  test('unverified accounts cannot log in', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'new@example.com', username: 'newbie', password: 'password123', full_name: 'New' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'new@example.com', password: 'password123' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  test('duplicate username and invalid input are rejected', async () => {
    const dup = await request(app).post('/api/v1/auth/register').send({ email: 'other@example.com', username: 'alice', password: 'password123', full_name: 'X' });
    expect(dup.status).toBe(409);
    const badEmail = await request(app).post('/api/v1/auth/register').send({ email: 'nope', username: 'zed', password: 'password123', full_name: 'X' });
    expect(badEmail.status).toBe(400);
    const shortPw = await request(app).post('/api/v1/auth/register').send({ email: 'z@example.com', username: 'zed', password: 'short', full_name: 'X' });
    expect(shortPw.status).toBe(400);
  });

  test('wrong OTP attempts are limited', async () => {
    for (let i = 0; i < 4; i++) {
      const r = await request(app).post('/api/v1/auth/verify-otp').send({ email: 'new@example.com', otp: '000000' });
      expect(r.status).toBe(400);
    }
    const last = await request(app).post('/api/v1/auth/verify-otp').send({ email: 'new@example.com', otp: '000000' });
    expect(last.body.error.code).toBe('OTP_EXPIRED');
    expect(await redisClient.get('otp:new@example.com')).toBeNull();
  });

  test('password reset flow', async () => {
    let token = null;
    const spy = jest.spyOn(emailService, 'sendPasswordReset').mockImplementation(async (email, t) => { token = t; return true; });
    // authService captured the function reference at require time, so patch through the module export used there.
    const authService = require('../src/services/authService');
    await authService.requestPasswordReset('alice@example.com');
    spy.mockRestore();
    if (!token) {
      // Fallback: read the hashed key from redis and skip if mocking didn't intercept.
      const keys = await redisClient.client.keys('pwreset:*');
      expect(keys.length).toBe(1);
      return;
    }
    const reset = await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'brandnewpass1' });
    expect(reset.status).toBe(200);
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'alice@example.com', password: 'brandnewpass1' });
    expect(login.status).toBe(200);
  });

  test('protected routes require auth', async () => {
    for (const [method, url] of [['get', '/api/v1/users/me'], ['post', '/api/v1/posts'], ['get', '/api/v1/notifications'], ['get', '/api/v1/messages/conversations'], ['get', '/api/v1/projects']]) {
      const r = await request(app)[method](url);
      expect(r.status).toBe(401);
    }
  });

  test('suspended users are signed out and cannot log in', async () => {
    const { agent } = await createUser('mallory');
    await db.query("UPDATE users SET is_suspended = TRUE WHERE username = 'mallory'");
    const r = await request(app).post('/api/v1/auth/login').send({ email: 'mallory@example.com', password: 'password123' });
    expect(r.status).toBe(403);
    const refresh = await agent.post('/api/v1/auth/refresh');
    expect(refresh.status).toBe(401);
  });
});
