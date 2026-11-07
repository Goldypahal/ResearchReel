const db = require('../config/db');
const crypto = require('crypto');
const redisClient = require('../config/redisClient');

class SessionRepository {
  hashToken(refreshToken) {
    return crypto.createHash('sha256').update(refreshToken).digest('hex');
  }

  async createSession({ userId, sid, refreshToken, deviceName, ipAddress, userAgent, expiresAt }) {
    const result = await db.query(
      `INSERT INTO user_sessions (user_id, sid, refresh_token_hash, device_name, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, device_name, expires_at, created_at`,
      [userId, sid || null, this.hashToken(refreshToken), (deviceName || 'Web Browser').slice(0, 255),
        ipAddress ? String(ipAddress).slice(0, 45) : null, userAgent || null, expiresAt]
    );
    return result.rows[0] || null;
  }

  async findActiveSession(refreshToken) {
    const result = await db.query(
      `SELECT id, user_id, sid, device_name, expires_at, revoked_at
         FROM user_sessions
        WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [this.hashToken(refreshToken)]
    );
    return result.rows[0] || null;
  }

  /** Marks a session as exchanged for a new one (its refresh token must not be used again). */
  async markRotated(sessionId, replacedBy) {
    await db.query(
      'UPDATE user_sessions SET revoked_at = NOW(), rotated_at = NOW(), replaced_by = $2 WHERE id = $1',
      [sessionId, replacedBy || null]
    );
  }

  /** The session a refresh token belonged to, if that token was already rotated. */
  async findRotatedSession(refreshToken) {
    const result = await db.query(
      `SELECT id, user_id, EXTRACT(EPOCH FROM (NOW() - rotated_at))::int AS seconds_since_rotation
         FROM user_sessions WHERE refresh_token_hash = $1 AND rotated_at IS NOT NULL`,
      [this.hashToken(refreshToken)]
    );
    return result.rows[0] || null;
  }

  /** Revokes every session that descends from this one through rotation. Returns how many were active. */
  async revokeSuccessors(sessionId) {
    const result = await db.query(
      `WITH RECURSIVE chain AS (
         SELECT replaced_by AS id, 1 AS depth FROM user_sessions WHERE id = $1 AND replaced_by IS NOT NULL
         UNION ALL
         SELECT s.replaced_by, c.depth + 1 FROM user_sessions s JOIN chain c ON s.id = c.id
          WHERE s.replaced_by IS NOT NULL AND c.depth < 1000
       )
       UPDATE user_sessions SET revoked_at = NOW()
        WHERE id IN (SELECT id FROM chain) AND revoked_at IS NULL
        RETURNING user_id, sid`,
      [sessionId]
    );
    for (const row of result.rows) {
      if (row.sid) await redisClient.del(`session:${row.user_id}:${row.sid}`);
    }
    return result.rows.length;
  }

  async listActiveSessions(userId) {
    const result = await db.query(
      `SELECT id, sid, device_name, ip_address, user_agent, created_at, last_used_at, expires_at
         FROM user_sessions
        WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
        ORDER BY last_used_at DESC NULLS LAST`,
      [userId]
    );
    return result.rows;
  }

  async revokeSession(sessionId) {
    const result = await db.query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1 RETURNING user_id, sid',
      [sessionId]
    );
    const row = result.rows[0];
    if (row && row.sid) await redisClient.del(`session:${row.user_id}:${row.sid}`);
  }

  async revokeUserSession(userId, sessionId) {
    const result = await db.query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL RETURNING sid',
      [sessionId, userId]
    );
    const row = result.rows[0];
    if (row && row.sid) await redisClient.del(`session:${userId}:${row.sid}`);
    return Boolean(row);
  }

  async revokeAllUserSessions(userId) {
    const result = await db.query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL RETURNING sid',
      [userId]
    );
    for (const row of result.rows) {
      if (row.sid) await redisClient.del(`session:${userId}:${row.sid}`);
    }
  }
}

module.exports = new SessionRepository();
