const { request, app, db, outbox, connect, close, uid, lastCode } = require('./helpers');

beforeAll(connect);
afterAll(close);

const API = '/api/v1/auth';

describe('sign-up, verification and sessions (real Postgres + Redis)', () => {
  const id = uid();
  const email = `signup_${id}@example.edu`;
  const password = 'First-Password-1';
  const agent = request.agent(app);

  it('registers an unverified account and emails a code', async () => {
    const res = await agent.post(`${API}/register`).send({ email, username: `s_${id}`, password, full_name: 'Sign Up' });
    expect(res.status).toBe(201);
    expect(res.body.data.requiresVerification).toBe(true);
    const row = await db.query('SELECT verification_status FROM users WHERE email = $1', [email]);
    expect(row.rows[0].verification_status).toBe('unverified');
    expect(lastCode(email)).toMatch(/^\d{6}$/);
  });

  it('rejects a duplicate email or username', async () => {
    const res = await request(app).post(`${API}/register`).send({ email, username: `other_${id}`, password, full_name: 'Dup' });
    expect(res.status).toBe(409);
  });

  it('refuses to sign in before the email is confirmed and sends a fresh code', async () => {
    const before = lastCode(email);
    const res = await agent.post(`${API}/login`).send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.data.requiresVerification).toBe(true);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(lastCode(email)).not.toBe(before);
  });

  it('burns a code after five wrong guesses', async () => {
    const real = lastCode(email);
    for (let i = 0; i < 5; i += 1) {
      const wrong = String((Number(real) + 1 + i) % 1000000).padStart(6, '0');
      const res = await agent.post(`${API}/verify-otp`).send({ email, otp: wrong });
      expect(res.status).toBe(400);
    }
    const res = await agent.post(`${API}/verify-otp`).send({ email, otp: real });
    expect(res.status).toBe(400);
  });

  it('verifies with a resent code and starts a cookie session', async () => {
    const resend = await agent.post(`${API}/resend-otp`).send({ email });
    expect(resend.status).toBe(200);
    const res = await agent.post(`${API}/verify-otp`).send({ email, otp: lastCode(email) });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'].join(';')).toMatch(/accessToken=.*HttpOnly/i);
    const me = await agent.get('/api/v1/users/me');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email);
  });

  it('rotates the refresh token and rejects the old one', async () => {
    const cookies = (await agent.post(`${API}/login`).send({ email, password })).headers['set-cookie'];
    const oldRefresh = cookies.find((c) => c.startsWith('refreshToken=')).split(';')[0];
    const rotated = await request(app).post(`${API}/refresh`).set('Cookie', oldRefresh);
    expect(rotated.status).toBe(200);
    const reused = await request(app).post(`${API}/refresh`).set('Cookie', oldRefresh);
    expect(reused.status).toBe(401);
  });

  it('does not accept a refresh token as an access token', async () => {
    const cookies = (await request(app).post(`${API}/login`).send({ email, password })).headers['set-cookie'];
    const refresh = cookies.find((c) => c.startsWith('refreshToken=')).split(';')[0].split('=')[1];
    const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${refresh}`);
    expect(res.status).toBe(401);
  });

  it('resets the password with an emailed code and signs out every session', async () => {
    const signedIn = request.agent(app);
    await signedIn.post(`${API}/login`).send({ email, password });
    expect((await signedIn.get('/api/v1/users/me')).status).toBe(200);

    // Same reply for unknown emails, so accounts can't be discovered.
    const unknown = await request(app).post(`${API}/password/forgot`).send({ email: `nobody_${id}@example.edu` });
    const known = await request(app).post(`${API}/password/forgot`).send({ email });
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);

    const code = lastCode(email);
    const reset = await request(app).post(`${API}/password/reset`).send({ email, code, new_password: 'Second-Password-2' });
    expect(reset.status).toBe(200);

    expect((await signedIn.get('/api/v1/users/me')).status).toBe(401);
    expect((await request(app).post(`${API}/login`).send({ email, password })).status).toBe(401);
    expect((await request(app).post(`${API}/login`).send({ email, password: 'Second-Password-2' })).status).toBe(200);
    // The code is single-use.
    expect((await request(app).post(`${API}/password/reset`).send({ email, code, new_password: 'Third-Password-3' })).status).toBe(400);
  });

  it('stores timestamps in UTC', async () => {
    const row = await db.query('SELECT created_at FROM users WHERE email = $1', [email]);
    expect(Math.abs(Date.now() - new Date(row.rows[0].created_at).getTime())).toBeLessThan(5 * 60 * 1000);
  });

  it('only sends email codes to the outbox in tests', () => {
    expect(outbox.every((m) => m.to.endsWith('@example.edu'))).toBe(true);
  });
});
