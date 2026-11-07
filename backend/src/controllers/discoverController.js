const db = require('../config/db');
const { notBlocked, notMuted } = require('../services/blockService');
const { sendSuccess } = require('../utils/response');
const { POST_SELECT } = require('../services/feedService');
const { REEL_SELECT } = require('./reelController');
const { PUBLIC_USER } = require('../repositories/userRepository');

/**
 * Explore grid: recent posts with images/papers and reels, ranked by engagement with time decay.
 */
exports.explore = async (req, res, next) => {
  try {
    const viewer = req.user?.id || null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 60);
    const posts = await db.query(
      `${POST_SELECT}
        WHERE p.deleted_at IS NULL AND p.content_type IN ('image', 'document') AND p.created_at > NOW() - INTERVAL '90 days'
          AND ${notBlocked('$1::uuid', 'p.author_id')} AND ${notMuted('$1::uuid', 'p.author_id')}
        ORDER BY ((SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) * 2
                 + (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) * 3 + 1)
                 / POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2, 1.2) DESC
        LIMIT $2`,
      [viewer, limit]
    );
    const reels = await db.query(
      `${REEL_SELECT}
        WHERE v.deleted_at IS NULL AND v.status = 'published' AND v.visibility = 'public' AND v.created_at > NOW() - INTERVAL '90 days'
          AND ${notBlocked('$1::uuid', 'v.author_id')} AND ${notMuted('$1::uuid', 'v.author_id')}
        ORDER BY ((SELECT COUNT(*) FROM video_likes l WHERE l.video_id = v.id) * 2 + 1)
                 / POWER(EXTRACT(EPOCH FROM (NOW() - v.created_at)) / 3600 + 2, 1.2) DESC
        LIMIT $2`,
      [viewer, Math.ceil(limit / 3)]
    );
    const items = [];
    const ps = posts.rows.map((p) => ({ type: 'post', ...p }));
    const rs = reels.rows.map((r) => ({ type: 'reel', ...r }));
    // Interleave: one reel after every few posts.
    while (ps.length || rs.length) {
      items.push(...ps.splice(0, 4));
      if (rs.length) items.push(rs.shift());
    }
    return sendSuccess(res, items.slice(0, limit), 'Explore.');
  } catch (error) {
    next(error);
  }
};

/** Discover page sections: trending papers, rising researchers, top tags. */
exports.discover = async (req, res, next) => {
  try {
    const viewer = req.user?.id || null;
    const papers = await db.query(
      `SELECT d.id, COALESCE(d.title, d.file_name) AS title, d.abstract, d.summary_text, d.authors, d.doi, d.journal,
              d.publication_year, d.tags, d.file_url, d.source, d.external_url, d.citation_count, d.created_at,
              u.username AS uploader_username, u.full_name AS uploader_name, u.profile_picture_url AS uploader_avatar_url,
              (SELECT COUNT(*)::int FROM posts p WHERE p.document_id = d.id AND p.deleted_at IS NULL) AS share_count,
              (SELECT COUNT(*)::int FROM videos v WHERE v.linked_paper_id = d.id AND v.deleted_at IS NULL) AS reel_count
         FROM documents d JOIN users u ON u.id = d.uploader_id AND u.is_deleted IS NOT TRUE
        WHERE d.deleted_at IS NULL AND d.visibility = 'public' AND ${notBlocked('$1::uuid', 'd.uploader_id')}
        ORDER BY (SELECT COUNT(*) FROM posts p JOIN reactions r ON r.post_id = p.id WHERE p.document_id = d.id) DESC, d.created_at DESC
        LIMIT 12`,
      [viewer]
    );
    const researchers = await db.query(
      `SELECT ${PUBLIC_USER},
              (SELECT COUNT(*)::int FROM follows f WHERE f.following_id = u.id) AS followers_count,
              (SELECT COUNT(*)::int FROM follows f WHERE f.following_id = u.id AND f.created_at > NOW() - INTERVAL '30 days') AS new_followers,
              CASE WHEN $1::uuid IS NULL THEN FALSE
                   ELSE EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1::uuid AND f.following_id = u.id) END AS is_following
         FROM users u
        WHERE u.is_deleted IS NOT TRUE AND u.email_verified IS TRUE AND ($1::uuid IS NULL OR u.id <> $1::uuid)
          AND ${notBlocked('$1::uuid', 'u.id')}
        ORDER BY new_followers DESC, followers_count DESC, u.created_at DESC
        LIMIT 12`,
      [viewer]
    );
    const tags = await db.query(
      `SELECT lower(t) AS tag, COUNT(*)::int AS count FROM (
         SELECT unnest(tags) AS t FROM posts WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '30 days'
         UNION ALL SELECT unnest(tags) FROM documents WHERE deleted_at IS NULL AND visibility = 'public'
       ) x WHERE t <> '' GROUP BY lower(t) ORDER BY count DESC LIMIT 20`
    );
    return sendSuccess(res, { papers: papers.rows, researchers: researchers.rows, tags: tags.rows }, 'Discover.');
  } catch (error) {
    next(error);
  }
};
