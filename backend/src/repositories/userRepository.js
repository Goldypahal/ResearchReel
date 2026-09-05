const pool = require('../config/db');

class UserRepository {
  /**
   * Safely retrieves public profile by username
   * Explicitly avoids SELECT u.* to prevent leaking passwords, tokens, or security metadata.
   */
  async findByUsername(username) {
    const query = `
      SELECT
        id,
        username,
        full_name,
        avatar_url,
        bio,
        institution,
        research_interests,
        created_at
      FROM users
      WHERE username = $1 AND (is_deleted IS FALSE OR is_deleted IS NULL);
    `;
    const result = await pool.query(query, [username]);
    return result.rows[0] || null;
  }

  /**
   * Finds full user by ID (for internal auth middleware and profile management)
   */
  async findById(userId) {
    const query = `
      SELECT id, full_name, username, email, role, avatar_url, bio, institution, research_interests, created_at
      FROM users
      WHERE id = $1 AND (is_deleted IS FALSE OR is_deleted IS NULL);
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Finds auth user including password hash (for authentication flows)
   */
  async findByEmailForAuth(email) {
    const query = `
      SELECT id, full_name, username, email, password_hash, role
      FROM users
      WHERE email = $1 AND (is_deleted IS FALSE OR is_deleted IS NULL);
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Creates a new user record
   */
  async createUser({ fullName, username, email, passwordHash, role = 'user' }) {
    const query = `
      INSERT INTO users (full_name, username, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, full_name, username, email, role, created_at;
    `;
    const result = await pool.query(query, [fullName, username, email, passwordHash, role]);
    return result.rows[0];
  }
}

module.exports = new UserRepository();
