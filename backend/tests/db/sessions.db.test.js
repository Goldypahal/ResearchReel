/** Account and session security: identity, tokens, and every sign-out path. */
const jwt = require('jsonwebtoken');
const { request, app, db, connect, close, uid, lastCode, signedInUser, PASSWORD } = require('./helpers');

beforeAll(connect);
afterAll(close);

const cookieValue = (res, name) => {
  const c = (res.headers['set-cookie'] || []).find((x) => x.startsWith(`${name}=`));
  return c ? c.split(';')[0].split('=')[1] : null;
};

/** Signs the same user in on a second "device" and returns its agent + tokens. */
const secondDevice = async (user) => {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD });
  expect(res.status).toBe(200);
  return { agent, access: cookieValue(res, 'accessToken'), refresh: cookieValue(res, 'refreshToken') };
};

const me = (agent) => agent.get('/api/v1/users/me').then((r) => r.status);

describe('account identity', () => {
  it('treats emails and usernames case-insensitively', async () => {
    const id = uid();
    const res = await request(app).post('/api/v1/auth/register').send({
      email: `  Mixed.Case_${id}@Example.EDU `, username: `Case_${id}`, password: 'Password-1234', full_name: 'Case Person',
    });
    expect(res.status).toBe(201);
    const stored = await db.query('SELECT email FROM users WHERE username = $1', [`Case_${id}`]);
    expect(stored.rows[0].email).toBe(`mixed.case_${id}@example.edu`);

    const dupEmail = await request(app).post('/api/v1/auth/register').send({
      email: `MIXED.CASE_${id}@example.edu`, username: `other_${id}`, password: 'Password-1234', full_name: 'X',
    });
    expect(dupEmail.status).toBe(409);
    const dupName = await request(app).post('/api/v1/auth/register').send({
      email: `fresh_${id}@example.edu`, username: `case_${id}`, password: 'Password-1234', full_name: 'X',
    });
    expect(dupName.status).toBe(409);

    // Confirm, then sign in typing the address differently.
    const email = `mixed.case_${id}@example.edu`;
    await request(app).post('/api/v1/auth/verify-otp').send({ email: email.toUpperCase(), otp: lastCode(email) }).expect(200);
    const login = await request(app).post('/api/v1/auth/login').send({ email: `MIXED.case_${id}@EXAMPLE.edu`, password: 'Password-1234' });
    expect(login.status).toBe(200);
  });

  it('enforces case-insensitive uniqueness in the database too', async () => {
    const { rows } = await db.query("SELECT indexname FROM pg_indexes WHERE tablename = 'users' AND indexname LIKE '%lower%'");
    expect(rows.map((r) => r.indexname).sort()).toEqual(['users_email_lower_key', 'users_username_lower_key']);
  });

  it('gives the same answer for a wrong password and an unknown account', async () => {
    const user = await signedInUser();
    const wrong = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'not-the-password' });
    const unknown = await request(app).post('/api/v1/auth/login').send({ email: `ghost_${uid()}@example.edu`, password: 'not-the-password' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body.message).toBe(wrong.body.message);
  });
});

describe('tokens', () => {
  it('rejects tokens without a session, with the wrong algorithm, or forged', async () => {
    const user = await signedInUser();
    const noSid = jwt.sign({ id: user.id, typ: 'access', role: 'admin' }, process.env.JWT_SECRET);
    const unsigned = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ id: user.id, sid: 'x', typ: 'access' })).toString('base64url')}.`;
    const forged = jwt.sign({ id: user.id, sid: 'x', typ: 'access' }, 'some-other-secret');
    for (const token of [noSid, unsigned, forged]) {
      expect((await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
    }
  });
});

describe('signing out', () => {
  it('signs out only the current device', async () => {
    const user = await signedInUser();
    const phone = await secondDevice(user);
    await user.agent.post('/api/v1/auth/logout').expect(200);
    expect(await me(user.agent)).toBe(401);
    expect(await me(phone.agent)).toBe(200);
  });

  it('signs out only the current device even without a refresh cookie', async () => {
    const user = await signedInUser();
    const laptop = await secondDevice(user);
    const phone = await secondDevice(user);
    await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${laptop.access}`).expect(200);
    expect((await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${laptop.access}`)).status).toBe(401);
    expect(await me(phone.agent)).toBe(200);
    // The phone can keep refreshing (its session wasn't revoked behind its back)...
    expect((await phone.agent.post('/api/v1/auth/refresh')).status).toBe(200);
    // ...and the laptop's refresh token is dead too, so it can't quietly come back.
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: laptop.refresh })).status).toBe(401);
  });

  it('signs out another device from the sessions list, immediately', async () => {
    const user = await signedInUser();
    const phone = await secondDevice(user);
    const list = await user.agent.get('/api/v1/auth/sessions');
    expect(list.body.data.length).toBeGreaterThanOrEqual(2);
    const other = list.body.data.find((s) => !s.current);
    await user.agent.delete(`/api/v1/auth/sessions/${other.id}`).expect(200);
    expect(await me(phone.agent)).toBe(401);
    expect(await me(user.agent)).toBe(200);
  });

  it('changing the password keeps this device and signs out the rest', async () => {
    const user = await signedInUser();
    const phone = await secondDevice(user);
    await user.agent.put('/api/v1/auth/password').send({ current_password: PASSWORD, new_password: 'A-brand-new-pass-99' }).expect(200);
    expect(await me(user.agent)).toBe(200);
    expect(await me(phone.agent)).toBe(401);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: phone.refresh })).status).toBe(401);
  });

  it('refuses to change the password without the current one', async () => {
    const user = await signedInUser();
    const res = await user.agent.put('/api/v1/auth/password').send({ current_password: 'wrong', new_password: 'A-brand-new-pass-99' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(await me(user.agent)).toBe(200);
  });

  it('deleting the account ends every session and refresh token', async () => {
    const user = await signedInUser();
    const phone = await secondDevice(user);
    await user.agent.delete('/api/v1/users/me').send({ password: PASSWORD, confirm: 'DELETE' }).expect(200);
    expect(await me(user.agent)).toBe(401);
    expect(await me(phone.agent)).toBe(401);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: phone.refresh })).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD })).status).toBe(401);
  });
});

describe('refresh token theft', () => {
  it('ends the session when an old refresh token is replayed later', async () => {
    const user = await signedInUser();
    const device = await secondDevice(user);
    const first = await device.agent.post('/api/v1/auth/refresh');
    expect(first.status).toBe(200);
    // Pretend the rotation happened a while ago, then replay the original token.
    await db.query("UPDATE user_sessions SET rotated_at = NOW() - interval '5 minutes' WHERE user_id = $1 AND rotated_at IS NOT NULL", [user.id]);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: device.refresh })).status).toBe(401);
    // The legitimate holder of that session is signed out too; other devices aren't.
    expect(await me(device.agent)).toBe(401);
    expect((await device.agent.post('/api/v1/auth/refresh')).status).toBe(401);
    expect(await me(user.agent)).toBe(200);
  });

  it('tolerates two tabs refreshing at the same moment', async () => {
    const user = await signedInUser();
    const device = await secondDevice(user);
    expect((await device.agent.post('/api/v1/auth/refresh')).status).toBe(200);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: device.refresh })).status).toBe(401);
    expect(await me(device.agent)).toBe(200);
  });
});
