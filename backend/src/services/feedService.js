const db = require('../config/db');
const searchService = require('./searchService');
const aiService = require('./aiService');

/**
 * Shared post projection. $1 is always the viewer id (or NULL for anonymous),
 * so viewer-specific flags can be computed in one round trip.
 */
const POST_SELECT = `
  SELECT
    p.id, p.author_id, p.content_type, p.caption, p.media_urls, p.tags,
    p.publication_status, p.doi, p.document_id, p.created_at, p.updated_at,
    u.username, u.full_name, u.verification_status, u.institution,
    COALESCE(u.avatar_url, u.profile_picture_url) AS avatar_url,
    d.file_name, d.title AS document_title, d.summary_text, d.file_url AS document_url,
    (SELECT COUNT(*)::int FROM reactions r WHERE r.post_id = p.id) AS reaction_count,
    (SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count,
    (SELECT r.reaction_type FROM reactions r WHERE r.post_id = p.id AND r.user_id = $1::uuid) AS viewer_reaction,
    EXISTS (SELECT 1 FROM bookmarks b WHERE b.post_id = p.id AND b.user_id = $1::uuid) AS is_bookmarked
  FROM posts p
  JOIN users u ON p.author_id = u.id
  LEFT JOIN documents d ON p.document_id = d.id
`;

const clampLimit = (limit, fallback = 20) => Math.min(Math.max(parseInt(limit, 10) || fallback, 1), 50);

/**
 * Feed of posts, newest first, cursor-paginated on created_at.
 *   scope=following -> only authors the viewer follows (plus the viewer)
 *   authorId        -> a single author's posts (profile page)
 *   tag             -> posts carrying a tag (explore)
 */
const getFeed = async (cursor, limit = 20, { viewerId = null, scope = 'all', authorId = null, tag = null } = {}) => {
  const params = [viewerId];
  const where = ['p.deleted_at IS NULL', '(u.is_deleted IS NULL OR u.is_deleted = FALSE)'];

  if (scope === 'following' && viewerId) {
    where.push('(p.author_id = $1::uuid OR p.author_id IN (SELECT following_id FROM follows WHERE follower_id = $1::uuid))');
  }
  if (authorId) {
    params.push(authorId);
    where.push(`p.author_id = $${params.length}`);
  }
  if (tag) {
    params.push(String(tag).replace(/^#/, '').toLowerCase());
    where.push(`EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE lower(t) = $${params.length})`);
  }
  if (cursor) {
    params.push(cursor);
    where.push(`p.created_at < $${params.length}`);
  }
  params.push(clampLimit(limit));

  const result = await db.query(
    `${POST_SELECT} WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC LIMIT $${params.length}`,
    params
  );
  const posts = result.rows;
  const nextCursor = posts.length === clampLimit(limit) ? posts[posts.length - 1].created_at.toISOString() : null;
  return { posts, nextCursor };
};

const getPostById = async (postId, viewerId = null) => {
  const result = await db.query(`${POST_SELECT} WHERE p.id = $2 AND p.deleted_at IS NULL`, [viewerId, postId]);
  return result.rows[0] || null;
};

/** Most-reacted posts of the last N days. */
const getTrending = async ({ viewerId = null, days = 7, limit = 20 } = {}) => {
  const result = await db.query(
    `${POST_SELECT}
     WHERE p.deleted_at IS NULL AND p.created_at > NOW() - ($2 || ' days')::interval
     ORDER BY reaction_count DESC, comment_count DESC, p.created_at DESC
     LIMIT $3`,
    [viewerId, String(days), clampLimit(limit)]
  );
  return result.rows;
};

const getTrendingTags = async ({ days = 30, limit = 12 } = {}) => {
  const result = await db.query(
    `SELECT lower(t) AS tag, COUNT(*)::int AS post_count
     FROM posts p, unnest(p.tags) t
     WHERE p.deleted_at IS NULL AND p.created_at > NOW() - ($1 || ' days')::interval
     GROUP BY lower(t)
     ORDER BY post_count DESC, tag ASC
     LIMIT $2`,
    [String(days), clampLimit(limit, 12)]
  );
  return result.rows;
};

const getBookmarked = async (viewerId, { cursor, limit = 20 } = {}) => {
  const params = [viewerId];
  let cursorSql = '';
  if (cursor) {
    params.push(cursor);
    cursorSql = `AND bm.created_at < $${params.length}`;
  }
  params.push(clampLimit(limit));
  const result = await db.query(
    `${POST_SELECT}
     JOIN bookmarks bm ON bm.post_id = p.id AND bm.user_id = $1::uuid
     WHERE p.deleted_at IS NULL ${cursorSql}
     ORDER BY bm.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  // expose when it was saved without clobbering the post's own created_at
  const saved = await db.query(
    'SELECT post_id, created_at FROM bookmarks WHERE user_id = $1 AND post_id = ANY($2::uuid[])',
    [viewerId, result.rows.map((r) => r.id)]
  );
  const savedAt = new Map(saved.rows.map((r) => [r.post_id, r.created_at]));
  const rows = result.rows.map((r) => ({ ...r, saved_at: savedAt.get(r.id) }));
  return {
    posts: rows,
    nextCursor: rows.length === clampLimit(limit) ? new Date(rows[rows.length - 1].saved_at).toISOString() : null
  };
};

const setBookmark = async (viewerId, postId, saved) => {
  if (saved) {
    await db.query(
      'INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [viewerId, postId]
    );
  } else {
    await db.query('DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2', [viewerId, postId]);
  }
  return { post_id: postId, is_bookmarked: Boolean(saved) };
};

const getComments = async (postId, { cursor, limit = 50 } = {}) => {
  const params = [postId];
  let cursorSql = '';
  if (cursor) {
    params.push(cursor);
    cursorSql = `AND c.created_at > $${params.length}`;
  }
  params.push(clampLimit(limit, 50));
  const result = await db.query(
    `SELECT c.id, c.post_id, c.parent_id, c.content, c.created_at,
            u.id AS author_id, u.username, u.full_name, u.verification_status,
            COALESCE(u.avatar_url, u.profile_picture_url) AS avatar_url
     FROM comments c JOIN users u ON u.id = c.author_id
     WHERE c.post_id = $1 AND c.deleted_at IS NULL ${cursorSql}
     ORDER BY c.created_at ASC
     LIMIT $${params.length}`,
    params
  );
  return result.rows;
};

const addComment = async ({ postId, authorId, content, parentId = null }) => {
  const result = await db.query(
    `INSERT INTO comments (post_id, author_id, content, parent_id)
     VALUES ($1, $2, $3, $4) RETURNING id, post_id, parent_id, content, created_at`,
    [postId, authorId, content, parentId]
  );
  const author = await db.query(
    `SELECT id AS author_id, username, full_name, verification_status,
            COALESCE(avatar_url, profile_picture_url) AS avatar_url
     FROM users WHERE id = $1`,
    [authorId]
  );
  return { ...result.rows[0], ...author.rows[0] };
};

const deleteComment = async (commentId, userId) => {
  const result = await db.query(
    `UPDATE comments SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
       AND (author_id = $2 OR post_id IN (SELECT id FROM posts WHERE author_id = $2))
     RETURNING id`,
    [commentId, userId]
  );
  return result.rowCount > 0;
};

const createPost = async ({ author_id, content_type, caption, media_urls, document_id, tags, publication_status, doi }) => {
  const newPost = await db.query(
    `INSERT INTO posts (author_id, content_type, caption, media_urls, document_id, tags, publication_status, doi) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [author_id, content_type, caption, media_urls, document_id, tags, publication_status, doi]
  );
  const post = newPost.rows[0];

  try {
    await searchService.indexEntity('posts', post.id, {
      id: post.id,
      author_id: post.author_id,
      caption: post.caption,
      tags: post.tags,
      publication_status: post.publication_status,
      content_type: post.content_type
    });
  } catch (err) {
    console.error('Failed to index post in search:', err.message);
  }

  return post;
};

const REACTION_TYPES = ['interesting', 'novel', 'needs_discussion'];

/** Sets the viewer's reaction; passing null (or the same type again via the toggle route) removes it. */
const reactToPost = async ({ post_id, user_id, reaction_type }) => {
  if (!reaction_type) {
    await db.query('DELETE FROM reactions WHERE post_id = $1 AND user_id = $2', [post_id, user_id]);
    return null;
  }
  if (!REACTION_TYPES.includes(reaction_type)) {
    const err = new Error(`reaction_type must be one of: ${REACTION_TYPES.join(', ')}`);
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  await db.query(
    `INSERT INTO reactions (post_id, user_id, reaction_type) VALUES ($1, $2, $3)
     ON CONFLICT (post_id, user_id) DO UPDATE SET reaction_type = EXCLUDED.reaction_type, created_at = NOW()`,
    [post_id, user_id, reaction_type]
  );
  return reaction_type;
};

const uploadDocument = async ({ uploader_id, file_name, file_type, file_url }) => {
  let newDoc = await db.query(
    `INSERT INTO documents (uploader_id, file_name, file_type, file_url) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [uploader_id, file_name, file_type, file_url]
  );
  let doc = newDoc.rows[0];

  try {
    const aiSummary = await aiService.summarizeDocument(doc.id);
    const updatedDoc = await db.query(
      `UPDATE documents SET summary_text = $1, key_points = $2 WHERE id = $3 RETURNING *`,
      [aiSummary.abstract, aiSummary.key_points, doc.id]
    );
    doc = updatedDoc.rows[0];
  } catch (err) {
    console.error('Failed to generate AI summary:', err.message);
    doc.summary_text = `Fallback Summary: Unable to generate AI insights for ${file_name}.`;
  }

  try {
    await searchService.indexEntity('documents', doc.id, {
      id: doc.id,
      file_name: doc.file_name,
      summary_text: doc.summary_text,
      uploader_id: doc.uploader_id
    });
  } catch (err) {
    console.error('Failed to index document in search:', err.message);
  }

  // Trigger auto-generator hook for reels
  try {
    const reelGeneratorService = require('./reelGeneratorService');
    reelGeneratorService.handleNewPaperUpload(doc.id, uploader_id).catch(err => {
      console.error('[Feed Service] Error during reel auto-generation hook:', err.message);
    });
  } catch (err) {
    console.error('[Feed Service] Failed to call reel auto-generation hook:', err.message);
  }

  return doc;
};

module.exports = {
  getFeed,
  getPostById,
  getTrending,
  getTrendingTags,
  getBookmarked,
  setBookmark,
  getComments,
  addComment,
  deleteComment,
  createPost,
  reactToPost,
  REACTION_TYPES,
  uploadDocument
};

