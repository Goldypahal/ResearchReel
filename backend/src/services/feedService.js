const db = require('../config/db');
const { notBlocked, notMuted } = require('./blockService');

/**
 * Builds the SELECT for posts with author info, counts and viewer state.
 * $1 is always the viewer id (nullable).
 */
const POST_SELECT = `
  SELECT p.id, p.author_id, p.content_type, p.caption, p.media_urls, p.document_id, p.tags,
         p.publication_status, p.doi, p.created_at, p.updated_at,
         u.username, u.full_name, u.profile_picture_url AS avatar_url, u.verification_status,
         d.id AS doc_id, COALESCE(d.title, d.file_name) AS document_title, d.file_url AS document_url,
         d.abstract AS document_abstract, d.page_count AS document_pages,
         (SELECT COUNT(*)::int FROM reactions r WHERE r.post_id = p.id) AS like_count,
         (SELECT COUNT(*)::int FROM post_comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count,
         CASE WHEN $1::uuid IS NULL THEN FALSE
              ELSE EXISTS (SELECT 1 FROM reactions r WHERE r.post_id = p.id AND r.user_id = $1::uuid) END AS is_liked,
         CASE WHEN $1::uuid IS NULL THEN FALSE
              ELSE EXISTS (SELECT 1 FROM bookmarks b WHERE b.post_id = p.id AND b.user_id = $1::uuid) END AS is_bookmarked
    FROM posts p
    JOIN users u ON u.id = p.author_id AND u.is_deleted IS NOT TRUE
    LEFT JOIN documents d ON d.id = p.document_id AND d.deleted_at IS NULL
`;

/**
 * @param {{ viewerId?: string, scope?: 'all'|'following', author?: string, tag?: string, cursor?: string, limit: number }} opts
 */
const getFeed = async ({ viewerId = null, scope = 'all', author = null, tag = null, cursor = null, limit = 20 }) => {
  const params = [viewerId];
  const where = ['p.deleted_at IS NULL', notBlocked('$1::uuid', 'p.author_id')];
  // Muted accounts leave the feeds, but their own profile still shows their posts.
  if (!author) where.push(notMuted('$1::uuid', 'p.author_id'));

  if (scope === 'following' && viewerId) {
    where.push('(p.author_id = $1::uuid OR p.author_id IN (SELECT following_id FROM follows WHERE follower_id = $1::uuid))');
  }
  if (author) {
    params.push(author);
    where.push(`LOWER(u.username) = LOWER($${params.length})`);
  }
  if (tag) {
    params.push(String(tag).replace(/^#/, '').toLowerCase());
    where.push(`EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE lower(t) = $${params.length})`);
  }
  if (cursor) {
    params.push(cursor);
    where.push(`p.created_at < $${params.length}`);
  }
  params.push(limit);

  const r = await db.query(
    `${POST_SELECT} WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC LIMIT $${params.length}`,
    params
  );
  return r.rows;
};

const getPost = async (postId, viewerId = null) => {
  const r = await db.query(
    `${POST_SELECT} WHERE p.id = $2 AND p.deleted_at IS NULL AND ${notBlocked('$1::uuid', 'p.author_id')}`,
    [viewerId, postId]
  );
  return r.rows[0] || null;
};

const createPost = async ({ authorId, contentType, caption, mediaUrls, documentId, tags, publicationStatus, doi }) => {
  const r = await db.query(
    `INSERT INTO posts (author_id, content_type, caption, media_urls, document_id, tags, publication_status, doi)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [authorId, contentType, caption || '', mediaUrls || [], documentId || null, tags || [], publicationStatus || null, doi || null]
  );
  return getPost(r.rows[0].id, authorId);
};

/** Extracts #hashtags from a caption, merged with explicit tags. */
const collectTags = (caption, tags = []) => {
  const fromCaption = (String(caption || '').match(/#[\p{L}\p{N}_]{2,50}/gu) || []).map((t) => t.slice(1));
  return [...new Set([...tags, ...fromCaption].map((t) => t.trim().replace(/^#/, '')).filter(Boolean))].slice(0, 20);
};

module.exports = { POST_SELECT, getFeed, getPost, createPost, collectTags };
