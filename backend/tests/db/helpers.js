const crypto = require('crypto');
const argon2 = require('argon2');
const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/config/db');
const redis = require('../../src/config/redisClient');
const { outbox } = require('../../src/utils/emailService');

/** Opens the shared Redis connection (the app skips auto-connect under NODE_ENV=test). */
const connect = async () => {
  if (!redis.client.isOpen) await redis.client.connect();
  // Start from a clean throttle/session state; never touch Redis database 0.
  const dbIndex = new URL(process.env.REDIS_URL).pathname.replace('/', '');
  if (dbIndex && dbIndex !== '0' && !global.__redisFlushed) {
    global.__redisFlushed = true;
    await redis.client.flushDb();
  }
};

const close = async () => {
  if (redis.client.isOpen) await redis.client.quit();
  await db.pool.end();
};

const uid = () => crypto.randomBytes(5).toString('hex');

/** Latest 6-digit code emailed to `to` (from the in-memory outbox). */
const lastCode = (to) => {
  const msg = [...outbox].reverse().find((m) => m.to === to && /code: \d{6}/.test(m.devNote || ''));
  return msg ? msg.devNote.match(/(\d{6})/)[1] : null;
};

const PASSWORD = 'Integration-Pass-123';

/**
 * Creates a verified user directly and returns a logged-in supertest agent.
 * `verification` can be 'verified' | 'student' | 'scholar' | 'faculty'.
 */
const signedInUser = async ({ verification = 'verified', role = 'user', name } = {}) => {
  const id = uid();
  const email = `user_${id}@example.edu`;
  const username = `u_${id}`;
  const res = await db.query(
    `INSERT INTO users (email, username, full_name, password_hash, verification_status, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [email, username, name || `Test ${id}`, await argon2.hash(PASSWORD), verification, role]
  );
  const agent = request.agent(app);
  const login = await agent.post('/api/v1/auth/login').send({ email, password: PASSWORD });
  if (login.status !== 200) throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body)}`);
  return { id: res.rows[0].id, email, username, agent };
};

module.exports = { app, db, redis, outbox, connect, close, uid, lastCode, signedInUser, PASSWORD, request };
