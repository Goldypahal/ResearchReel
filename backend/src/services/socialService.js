const db = require('../config/db');
const { notify } = require('./notificationService');

/** Public-safe user columns. $1 is the viewer id (may be NULL). */
const USER_CARD = `
  u.id, u.username, u.full_name, u.bio, u.institution, u.verification_status,
  COALESCE(u.avatar_url, u.profile_picture_url) AS avatar_url,
  EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1::uuid AND f.following_id = u.id) AS is_following
`;
const ACTIVE_USER = '(u.is_deleted IS NULL OR u.is_deleted = FALSE)';

class SocialError extends Error {
  constructor(message, statusCode = 400, code = 'VALIDATION_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const findUserIdByUsername = async (username) => {
  const result = await db.query(
    `SELECT id FROM users u WHERE lower(u.username) = lower($1) AND ${ACTIVE_USER}`,
    [username]
  );
  if (!result.rows.length) throw new SocialError('User not found.', 404, 'NOT_FOUND');
  return result.rows[0].id;
};

const getProfile = async (username, viewerId = null) => {
  const result = await db.query(
    `SELECT ${USER_CARD}, u.research_interests, u.orcid_id, u.created_at,
       (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) AS follower_count,
       (SELECT COUNT(*)::int FROM follows WHERE follower_id = u.id) AS following_count,
       (SELECT COUNT(*)::int FROM posts p WHERE p.author_id = u.id AND p.deleted_at IS NULL) AS post_count,
       (SELECT COUNT(*)::int FROM videos v WHERE v.author_id = u.id AND v.deleted_at IS NULL) AS reel_count,
       (SELECT COUNT(*)::int FROM reactions r JOIN posts p ON p.id = r.post_id WHERE p.author_id = u.id) AS reactions_received,
       (u.id = $1::uuid) AS is_self
     FROM users u
     WHERE lower(u.username) = lower($2) AND ${ACTIVE_USER}`,
    [viewerId, username]
  );
  if (!result.rows.length) throw new SocialError('User not found.', 404, 'NOT_FOUND');
  return result.rows[0];
};

const follow = async (followerId, username) => {
  const targetId = await findUserIdByUsername(username);
  if (targetId === followerId) throw new SocialError('You cannot follow yourself.');
  const inserted = await db.query(
    'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING follower_id',
    [followerId, targetId]
  );
  if (inserted.rowCount) {
    await notify({ userId: targetId, actorId: followerId, type: 'follow', entityType: 'user', entityId: followerId });
  }
  return { username, is_following: true };
};

const unfollow = async (followerId, username) => {
  const targetId = await findUserIdByUsername(username);
  await db.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, targetId]);
  return { username, is_following: false };
};

/** type: 'followers' | 'following' */
const listConnections = async (username, type, viewerId = null, { limit = 50, offset = 0 } = {}) => {
  const userId = await findUserIdByUsername(username);
  const join = type === 'followers'
    ? 'JOIN follows c ON c.follower_id = u.id AND c.following_id = $2'
    : 'JOIN follows c ON c.following_id = u.id AND c.follower_id = $2';
  const result = await db.query(
    `SELECT ${USER_CARD}, c.created_at AS connected_at
     FROM users u ${join}
     WHERE ${ACTIVE_USER}
     ORDER BY c.created_at DESC
     LIMIT $3 OFFSET $4`,
    [viewerId, userId, Math.min(Number(limit) || 50, 100), Math.max(Number(offset) || 0, 0)]
  );
  return result.rows;
};

/**
 * Who to follow: people followed by the people you follow, then people who share
 * a research interest, then the most-followed accounts. Excludes self and existing follows.
 */
const suggestions = async (viewerId, limit = 8) => {
  const result = await db.query(
    `WITH me AS (SELECT research_interests FROM users WHERE id = $1::uuid)
     SELECT ${USER_CARD},
       (SELECT COUNT(*)::int FROM follows f2
         WHERE f2.following_id = u.id
           AND f2.follower_id IN (SELECT following_id FROM follows WHERE follower_id = $1::uuid)) AS mutual_count,
       (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) AS follower_count
     FROM users u, me
     WHERE u.id <> $1::uuid AND ${ACTIVE_USER}
       AND u.verification_status <> 'unverified'
       AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1::uuid AND f.following_id = u.id)
     ORDER BY mutual_count DESC,
              (COALESCE(u.research_interests, '{}') && COALESCE(me.research_interests, '{}')) DESC,
              follower_count DESC,
              u.created_at DESC
     LIMIT $2`,
    [viewerId, Math.min(Number(limit) || 8, 30)]
  );
  return result.rows;
};

const searchUsers = async (query, viewerId = null, limit = 20) => {
  const q = String(query || '').trim();
  if (!q) return [];
  const result = await db.query(
    `SELECT ${USER_CARD}
     FROM users u
     WHERE ${ACTIVE_USER} AND u.verification_status <> 'unverified'
       AND (u.username ILIKE $2 OR u.full_name ILIKE $2 OR u.institution ILIKE $2
            OR EXISTS (SELECT 1 FROM unnest(u.research_interests) ri WHERE ri ILIKE $2))
     ORDER BY (lower(u.username) = lower($3)) DESC, u.full_name ASC NULLS LAST
     LIMIT $4`,
    [viewerId, `%${q.replace(/[%_]/g, '\\$&')}%`, q, Math.min(Number(limit) || 20, 50)]
  );
  return result.rows;
};

/**
 * Leaderboard score over a window: reactions received x3, comments received x2,
 * posts published x5, new followers x4. All counts come from real activity rows.
 */
const PERIOD_DAYS = { week: 7, month: 30, all: 36500 };
const leaderboard = async (viewerId = null, { period = 'month', field = null, limit = 50 } = {}) => {
  const days = PERIOD_DAYS[period] || PERIOD_DAYS.month;
  const params = [viewerId, String(days), Math.min(Number(limit) || 50, 100)];
  let fieldSql = '';
  if (field) {
    params.push(`%${field}%`);
    fieldSql = `AND EXISTS (SELECT 1 FROM unnest(u.research_interests) ri WHERE ri ILIKE $${params.length})`;
  }
  const result = await db.query(
    `WITH win AS (SELECT NOW() - ($2 || ' days')::interval AS since),
     stats AS (
       SELECT u.id,
         (SELECT COUNT(*) FROM reactions r JOIN posts p ON p.id = r.post_id, win
           WHERE p.author_id = u.id AND r.created_at > win.since)::int AS reactions,
         (SELECT COUNT(*) FROM comments c JOIN posts p ON p.id = c.post_id, win
           WHERE p.author_id = u.id AND c.author_id <> u.id AND c.deleted_at IS NULL AND c.created_at > win.since)::int AS comments,
         (SELECT COUNT(*) FROM posts p, win
           WHERE p.author_id = u.id AND p.deleted_at IS NULL AND p.created_at > win.since)::int AS posts,
         (SELECT COUNT(*) FROM follows f, win
           WHERE f.following_id = u.id AND f.created_at > win.since)::int AS new_followers
       FROM users u
       WHERE ${ACTIVE_USER} AND u.verification_status <> 'unverified' ${fieldSql}
     )
     SELECT ${USER_CARD}, u.research_interests,
       s.reactions, s.comments, s.posts, s.new_followers,
       (s.reactions * 3 + s.comments * 2 + s.posts * 5 + s.new_followers * 4) AS score
     FROM stats s JOIN users u ON u.id = s.id
     WHERE (s.reactions + s.comments + s.posts + s.new_followers) > 0
     ORDER BY score DESC, u.username ASC
     LIMIT $3`,
    params
  );
  return result.rows.map((row, i) => ({ rank: i + 1, ...row }));
};

/**
 * Achievements are derived from real activity, so they can never drift from the data.
 */
const ACHIEVEMENTS = [
  { id: 'first_post', title: 'First Publication', description: 'Share your first post.', metric: 'posts', target: 1 },
  { id: 'prolific', title: 'Prolific Author', description: 'Share 25 posts.', metric: 'posts', target: 25 },
  { id: 'first_reel', title: 'Lights, Camera, Science', description: 'Publish your first reel.', metric: 'reels', target: 1 },
  { id: 'paper_trail', title: 'Paper Trail', description: 'Upload 5 papers to your library.', metric: 'documents', target: 5 },
  { id: 'rising_voice', title: 'Rising Voice', description: 'Reach 10 followers.', metric: 'followers', target: 10 },
  { id: 'thought_leader', title: 'Thought Leader', description: 'Reach 100 followers.', metric: 'followers', target: 100 },
  { id: 'well_received', title: 'Well Received', description: 'Receive 50 reactions on your posts.', metric: 'reactions', target: 50 },
  { id: 'conversationalist', title: 'Conversationalist', description: 'Leave 20 comments.', metric: 'comments', target: 20 },
  { id: 'collaborator', title: 'Collaborator', description: 'Join or create 3 projects.', metric: 'projects', target: 3 },
  { id: 'verified_scholar', title: 'Verified Scholar', description: 'Verify your academic identity.', metric: 'verified', target: 1 }
];

const achievements = async (userId) => {
  const result = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM posts WHERE author_id = $1 AND deleted_at IS NULL)::int AS posts,
       (SELECT COUNT(*) FROM videos WHERE author_id = $1 AND deleted_at IS NULL)::int AS reels,
       (SELECT COUNT(*) FROM documents WHERE uploader_id = $1 AND deleted_at IS NULL)::int AS documents,
       (SELECT COUNT(*) FROM follows WHERE following_id = $1)::int AS followers,
       (SELECT COUNT(*) FROM reactions r JOIN posts p ON p.id = r.post_id WHERE p.author_id = $1)::int AS reactions,
       (SELECT COUNT(*) FROM comments WHERE author_id = $1 AND deleted_at IS NULL)::int AS comments,
       (SELECT COUNT(*) FROM project_members WHERE user_id = $1)::int AS projects,
       (SELECT CASE WHEN verification_status IN ('student','scholar','faculty','admin') THEN 1 ELSE 0 END
          FROM users WHERE id = $1) AS verified`,
    [userId]
  );
  const stats = result.rows[0];
  const items = ACHIEVEMENTS.map((a) => {
    const progress = Number(stats[a.metric] || 0);
    return { ...a, progress: Math.min(progress, a.target), unlocked: progress >= a.target };
  });
  return { stats, achievements: items, unlocked_count: items.filter((a) => a.unlocked).length, total: items.length };
};

module.exports = {
  SocialError,
  findUserIdByUsername,
  getProfile,
  follow,
  unfollow,
  listConnections,
  suggestions,
  searchUsers,
  leaderboard,
  achievements
};
