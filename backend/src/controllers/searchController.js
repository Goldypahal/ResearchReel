const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
const { PUBLIC_USER } = require('../repositories/userRepository');
const { POST_SELECT } = require('../services/feedService');
const { REEL_SELECT } = require('./reelController');

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * GET /search?q=...&type=all|users|posts|papers|reels&limit=
 * Postgres-backed search across people, posts, papers and reels.
 */
exports.search = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 200);
    const type = ['users', 'posts', 'papers', 'reels'].includes(req.query.type) ? req.query.type : 'all';
    const limit = Math.min(parseInt(req.query.limit, 10) || (type === 'all' ? 5 : 20), 50);
    if (q.length < 1) return sendError(res, 'Enter something to search for.', 400, 'VALIDATION_ERROR', req);

    const viewer = req.user?.id || null;
    const isTag = q.startsWith('#');
    const term = isTag ? q.slice(1).toLowerCase() : q;
    const like = `%${escapeLike(term)}%`;
    const out = {};

    if (type === 'all' || type === 'users') {
      const r = await db.query(
        `SELECT ${PUBLIC_USER},
                (SELECT COUNT(*)::int FROM follows f WHERE f.following_id = u.id) AS followers_count,
                CASE WHEN $3::uuid IS NULL THEN FALSE
                     ELSE EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $3::uuid AND f.following_id = u.id) END AS is_following
           FROM users u
          WHERE u.is_deleted IS NOT TRUE AND u.email_verified IS TRUE
            AND (u.username ILIKE $1 OR u.full_name ILIKE $1 OR u.institution ILIKE $1
                 OR array_to_string(u.research_interests, ' ') ILIKE $1)
          ORDER BY (LOWER(u.username) = LOWER($4)) DESC, followers_count DESC
          LIMIT $2`,
        [like, limit, viewer, term]
      );
      out.users = r.rows;
    }

    if (type === 'all' || type === 'posts') {
      const r = await db.query(
        `${POST_SELECT}
          WHERE p.deleted_at IS NULL AND (
            ${isTag ? 'EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE lower(t) = $2)' : `p.caption ILIKE $2 OR array_to_string(p.tags, ' ') ILIKE $2 OR d.title ILIKE $2`}
          )
          ORDER BY p.created_at DESC LIMIT $3`,
        [viewer, isTag ? term : like, limit]
      );
      out.posts = r.rows;
    }

    if (type === 'all' || type === 'papers') {
      const r = await db.query(
        `SELECT d.id, COALESCE(d.title, d.file_name) AS title, d.abstract, d.authors, d.doi, d.journal, d.publication_year,
                d.tags, d.file_url, d.source, d.created_at, u.username AS uploader_username, u.full_name AS uploader_name
           FROM documents d JOIN users u ON u.id = d.uploader_id
          WHERE d.deleted_at IS NULL AND d.visibility = 'public' AND (
            ${isTag ? 'EXISTS (SELECT 1 FROM unnest(d.tags) t WHERE lower(t) = $1)' : `COALESCE(d.title, d.file_name) ILIKE $1 OR d.abstract ILIKE $1 OR array_to_string(d.authors, ' ') ILIKE $1 OR d.doi ILIKE $1 OR array_to_string(d.tags, ' ') ILIKE $1`}
          )
          ORDER BY d.created_at DESC LIMIT $2`,
        [isTag ? term : like, limit]
      );
      out.papers = r.rows;
    }

    if (type === 'all' || type === 'reels') {
      const r = await db.query(
        `${REEL_SELECT}
          WHERE v.deleted_at IS NULL AND v.status = 'published' AND v.visibility = 'public' AND (
            ${isTag ? 'EXISTS (SELECT 1 FROM unnest(v.tags) t WHERE lower(t) = $2)' : `v.title ILIKE $2 OR v.description ILIKE $2 OR array_to_string(v.tags, ' ') ILIKE $2`}
          )
          ORDER BY v.created_at DESC LIMIT $3`,
        [viewer, isTag ? term : like, limit]
      );
      out.reels = r.rows;
    }

    return sendSuccess(res, out, 'Search results.');
  } catch (error) {
    next(error);
  }
};

/** Trending hashtags over the last 14 days of posts and reels. */
exports.trendingTags = async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT lower(t) AS tag, COUNT(*)::int AS count FROM (
         SELECT unnest(tags) AS t FROM posts WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '14 days'
         UNION ALL
         SELECT unnest(tags) FROM videos WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '14 days'
       ) x WHERE t IS NOT NULL AND t <> '' GROUP BY lower(t) ORDER BY count DESC LIMIT 15`
    );
    return sendSuccess(res, r.rows, 'Trending tags.');
  } catch (error) {
    next(error);
  }
};
