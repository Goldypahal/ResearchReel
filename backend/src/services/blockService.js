const db = require('../config/db');

/**
 * Blocks hide two accounts from each other in both directions; mutes only quiet the
 * muted account in the muter's feeds. The SQL helpers are dropped into WHERE clauses;
 * `viewer` and `other` are SQL expressions (a $n::uuid parameter and a column). With a
 * NULL viewer (signed out) they are always true.
 */
const notBlocked = (viewer, other) => `NOT EXISTS (
  SELECT 1 FROM user_blocks ub
   WHERE (ub.blocker_id = ${viewer} AND ub.blocked_id = ${other})
      OR (ub.blocker_id = ${other} AND ub.blocked_id = ${viewer}))`;

const notMuted = (viewer, other) => `NOT EXISTS (
  SELECT 1 FROM user_mutes um WHERE um.muter_id = ${viewer} AND um.muted_id = ${other})`;

class BlockError extends Error {
  constructor(message = "You can't interact with this account.", statusCode = 403, code = 'BLOCKED') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** True when either account has blocked the other. */
const isBlockedEitherWay = async (a, b) => {
  if (!a || !b || a === b) return false;
  const { rowCount } = await db.query(
    `SELECT 1 FROM user_blocks
      WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1) LIMIT 1`,
    [a, b]
  );
  return rowCount > 0;
};

/** Throws a 403 BlockError when the two accounts have blocked each other in either direction. */
const assertNotBlocked = async (a, b) => {
  if (await isBlockedEitherWay(a, b)) throw new BlockError();
};

/** Of the given user ids, those blocked by or blocking `userId`. */
const blockedAmong = async (userId, ids) => {
  if (!userId || !ids.length) return new Set();
  const { rows } = await db.query(
    `SELECT CASE WHEN blocker_id = $1 THEN blocked_id ELSE blocker_id END AS id
       FROM user_blocks
      WHERE (blocker_id = $1 AND blocked_id = ANY($2::uuid[])) OR (blocked_id = $1 AND blocker_id = ANY($2::uuid[]))`,
    [userId, ids]
  );
  return new Set(rows.map((r) => r.id));
};

const targetId = async (username) => {
  const { rows } = await db.query(
    'SELECT id, username FROM users WHERE lower(username) = lower($1) AND is_deleted IS NOT TRUE',
    [String(username || '').replace(/^@/, '')]
  );
  if (!rows[0]) throw new BlockError('User not found.', 404, 'NOT_FOUND');
  return rows[0];
};

/** Blocking also removes follows in both directions. */
const block = async (blockerId, username) => {
  const target = await targetId(username);
  if (target.id === blockerId) throw new BlockError("You can't block yourself.", 400, 'VALIDATION_ERROR');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [blockerId, target.id]);
    await client.query(
      'DELETE FROM follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1)',
      [blockerId, target.id]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return { username: target.username, is_blocked: true };
};

const unblock = async (blockerId, username) => {
  const target = await targetId(username);
  await db.query('DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [blockerId, target.id]);
  return { username: target.username, is_blocked: false };
};

const mute = async (muterId, username) => {
  const target = await targetId(username);
  if (target.id === muterId) throw new BlockError("You can't mute yourself.", 400, 'VALIDATION_ERROR');
  await db.query('INSERT INTO user_mutes (muter_id, muted_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [muterId, target.id]);
  return { username: target.username, is_muted: true };
};

const unmute = async (muterId, username) => {
  const target = await targetId(username);
  await db.query('DELETE FROM user_mutes WHERE muter_id = $1 AND muted_id = $2', [muterId, target.id]);
  return { username: target.username, is_muted: false };
};

/** The viewer's blocked and muted accounts, newest first. */
const list = async (userId) => {
  const card = 'u.id, u.username, u.full_name, u.verification_status, u.profile_picture_url AS avatar_url';
  const [blocked, muted] = await Promise.all([
    db.query(`SELECT ${card}, b.created_at FROM user_blocks b JOIN users u ON u.id = b.blocked_id
               WHERE b.blocker_id = $1 ORDER BY b.created_at DESC`, [userId]),
    db.query(`SELECT ${card}, m.created_at FROM user_mutes m JOIN users u ON u.id = m.muted_id
               WHERE m.muter_id = $1 ORDER BY m.created_at DESC`, [userId])
  ]);
  return { blocked: blocked.rows, muted: muted.rows };
};

module.exports = { notBlocked, notMuted, isBlockedEitherWay, assertNotBlocked, blockedAmong, block, unblock, mute, unmute, list, BlockError };
