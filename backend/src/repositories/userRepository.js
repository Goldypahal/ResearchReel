const db = require('../config/db');

/** Public-safe user columns (never includes email or password hash). */
const PUBLIC_USER = `
  u.id, u.username, u.full_name, u.bio, u.profile_picture_url AS avatar_url,
  u.verification_status, u.role, u.institution, u.website, u.research_interests,
  u.orcid_id, u.created_at
`;

class UserRepository {
  async findByUsername(username, viewerId = null) {
    const result = await db.query(
      `SELECT ${PUBLIC_USER},
        (SELECT COUNT(*)::int FROM follows f WHERE f.following_id = u.id) AS followers_count,
        (SELECT COUNT(*)::int FROM follows f WHERE f.follower_id = u.id) AS following_count,
        (SELECT COUNT(*)::int FROM posts p WHERE p.author_id = u.id AND p.deleted_at IS NULL) AS post_count,
        (SELECT COUNT(*)::int FROM videos v WHERE v.author_id = u.id AND v.deleted_at IS NULL) AS reel_count,
        (SELECT COUNT(*)::int FROM documents d WHERE d.uploader_id = u.id AND d.deleted_at IS NULL AND d.visibility = 'public') AS paper_count,
        CASE WHEN $2::uuid IS NULL THEN FALSE
             ELSE EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $2::uuid AND f.following_id = u.id) END AS is_following,
        CASE WHEN $2::uuid IS NULL THEN FALSE
             ELSE EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = u.id AND f.following_id = $2::uuid) END AS follows_you
       FROM users u
       WHERE LOWER(u.username) = LOWER($1) AND u.is_deleted IS NOT TRUE`,
      [username, viewerId]
    );
    return result.rows[0] || null;
  }

  async findById(userId) {
    const result = await db.query(
      `SELECT ${PUBLIC_USER}, u.email, u.email_verified, u.subscription_tier
         FROM users u WHERE u.id = $1 AND u.is_deleted IS NOT TRUE`,
      [userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new UserRepository();
module.exports.PUBLIC_USER = PUBLIC_USER;
