const db = require('../config/db');
const { notBlocked, notMuted } = require('./blockService');

const MAX_STORY_LENGTH = 280;
const GRADIENT_PATTERN = /^[a-z0-9:\-\/\s\[\]#().,%]{0,120}$/i;

/** Active (unexpired) stories from the viewer and the people they follow, grouped by author. */
const feed = async (viewerId) => {
  const result = await db.query(
    `SELECT s.id, s.text, s.gradient, s.created_at, s.expires_at,
            u.id AS author_id, u.username, u.full_name,
            COALESCE(u.avatar_url, u.profile_picture_url) AS avatar_url,
            EXISTS (SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.user_id = $1) AS viewed
     FROM stories s
     JOIN users u ON u.id = s.author_id
     WHERE s.expires_at > NOW()
       AND (s.author_id = $1 OR (s.author_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
            AND ${notBlocked('$1', 's.author_id')} AND ${notMuted('$1', 's.author_id')}))
     ORDER BY (s.author_id = $1) DESC, s.created_at ASC`,
    [viewerId]
  );
  return result.rows;
};

const create = async (authorId, { text, gradient }) => {
  const body = String(text || '').trim();
  if (!body) {
    const err = new Error('Story text is required.');
    err.statusCode = 400; err.code = 'VALIDATION_ERROR';
    throw err;
  }
  if (body.length > MAX_STORY_LENGTH) {
    const err = new Error(`Stories are limited to ${MAX_STORY_LENGTH} characters.`);
    err.statusCode = 400; err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const safeGradient = gradient && GRADIENT_PATTERN.test(gradient) ? gradient : null;
  const result = await db.query(
    `INSERT INTO stories (author_id, text, gradient) VALUES ($1, $2, $3)
     RETURNING id, text, gradient, created_at, expires_at`,
    [authorId, body, safeGradient]
  );
  return result.rows[0];
};

/** Only stories the viewer is allowed to see can be marked viewed. */
const markViewed = async (viewerId, storyId) => {
  await db.query(
    `INSERT INTO story_views (story_id, user_id)
     SELECT s.id, $1 FROM stories s
     WHERE s.id = $2 AND s.expires_at > NOW()
       AND (s.author_id = $1 OR s.author_id IN (SELECT following_id FROM follows WHERE follower_id = $1))
     ON CONFLICT DO NOTHING`,
    [viewerId, storyId]
  );
};

const remove = async (authorId, storyId) => {
  const result = await db.query('DELETE FROM stories WHERE id = $1 AND author_id = $2', [storyId, authorId]);
  return result.rowCount > 0;
};

module.exports = { feed, create, markViewed, remove };
