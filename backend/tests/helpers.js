const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const redisClient = require('../src/config/redisClient');

const waitForRedis = async () => {
  for (let i = 0; i < 50 && !redisClient.client.isReady; i++) await new Promise((r) => setTimeout(r, 100));
};

/** Registers a user through the real OTP flow and returns a cookie-carrying agent. */
const createUser = async (username, { role } = {}) => {
  await waitForRedis();
  const agent = request.agent(app);
  const email = `${username}@example.com`;
  const reg = await agent.post('/api/v1/auth/register').send({ email, username, password: 'password123', full_name: `${username} Test` });
  if (reg.status !== 201) throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.body)}`);
  const otp = JSON.parse(await redisClient.get(`otp:${email}`)).otp;
  const ver = await agent.post('/api/v1/auth/verify-otp').send({ email, otp });
  if (ver.status !== 200) throw new Error(`verify failed: ${JSON.stringify(ver.body)}`);
  if (role) await db.query('UPDATE users SET role = $1 WHERE username = $2', [role, username]);
  return { agent, user: ver.body.data.user, email };
};

const resetDb = async () => {
  const r = await db.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'pgmigrations'`);
  await db.query(`TRUNCATE ${r.rows.map((x) => `"${x.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  await redisClient.client.flushDb();
};

const close = async () => {
  await require('../src/services/analyticsService').flushQueue();
  await db.pool.end();
  await redisClient.client.quit().catch(() => {});
};

module.exports = { app, request, db, redisClient, createUser, resetDb, close };
