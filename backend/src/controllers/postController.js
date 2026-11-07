const db = require('../config/db');
const feedService = require('../services/feedService');
const blockService = require('../services/blockService');
const commentService = require('../services/commentService');
const analyticsService = require('../services/analyticsService');
const storageService = require('../services/storageService');
const documentService = require('../services/documentService');
const { notify, retract } = require('../services/notificationService');
const { moderateText } = require('../utils/moderator');
const { sendSuccess, sendError } = require('../utils/response');
const { parsePage, nextCursorOf, isUuid } = require('../utils/pagination');
const { postSchema } = require('../utils/validators');

const parseMaybeJson = (v) => {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch (e) { return v; }
};

exports.getFeed = async (req, res, next) => {
  try {
    const { limit, cursor } = parsePage(req.query, 10, 30);
    const posts = await feedService.getFeed({
      viewerId: req.user?.id || null,
      scope: req.query.scope === 'following' ? 'following' : 'all',
      author: req.query.author ? String(req.query.author) : null,
      tag: req.query.tag ? String(req.query.tag) : null,
      cursor,
      limit
    });
    return sendSuccess(res, { posts, nextCursor: nextCursorOf(posts, limit) }, 'Feed retrieved.');
  } catch (error) {
    next(error);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    const post = await feedService.getPost(req.params.id, req.user?.id || null);
    if (!post) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, post, 'Post retrieved.');
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a post. Accepts JSON, or multipart/form-data with up to 10 `images`
 * and/or one `document` (PDF). Text fields may be sent as form fields.
 */
exports.createPost = async (req, res, next) => {
  try {
    const raw = { ...(req.body || {}) };
    raw.tags = parseMaybeJson(raw.tags);
    raw.media_urls = parseMaybeJson(raw.media_urls);
    if (typeof raw.tags === 'string') raw.tags = raw.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (raw.document_id === '') delete raw.document_id;

    const parsed = postSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid post.';
      return sendError(res, msg, 400, 'VALIDATION_ERROR', req);
    }
    const body = parsed.data;

    const images = req.files?.images || [];
    const docFile = req.files?.document?.[0] || null;

    if (!body.caption && !images.length && !docFile && !body.document_id && !body.media_urls.length) {
      return sendError(res, 'Write something or attach a file to post.', 400, 'VALIDATION_ERROR', req);
    }

    const mod = moderateText(body.caption);
    if (!mod.clean) {
      return sendError(res, `Your post was blocked by our spam filter ("${mod.matchedKeyword}").`, 400, 'CONTENT_REJECTED', req);
    }

    let documentId = body.document_id || null;
    if (documentId) {
      const own = await db.query('SELECT 1 FROM documents WHERE id = $1 AND uploader_id = $2 AND deleted_at IS NULL', [documentId, req.user.id]);
      if (!own.rows.length) return sendError(res, 'You can only attach papers you uploaded.', 403, 'AUTHORIZATION_ERROR', req);
    }
    if (docFile) {
      const doc = await documentService.createFromUpload({
        file: docFile,
        userId: req.user.id,
        fields: { title: req.body.document_title, doi: body.doi, tags: body.tags }
      });
      documentId = doc.id;
    }

    const mediaUrls = [];
    for (const img of images) {
      const saved = await storageService.saveFile({ buffer: img.buffer, originalName: img.originalname, mimeType: img.mimetype, folder: 'posts' });
      mediaUrls.push(saved.url);
    }
    // Only allow previously-uploaded media from our own storage, never arbitrary URLs.
    for (const u of body.media_urls) {
      if (u.startsWith('/uploads/') || (process.env.S3_PUBLIC_URL && u.startsWith(process.env.S3_PUBLIC_URL))) mediaUrls.push(u);
    }

    let contentType = body.content_type;
    if (documentId) contentType = 'document';
    else if (mediaUrls.length) contentType = 'image';
    else contentType = 'text';

    const post = await feedService.createPost({
      authorId: req.user.id,
      contentType,
      caption: body.caption,
      mediaUrls,
      documentId,
      tags: feedService.collectTags(body.caption, body.tags),
      publicationStatus: body.publication_status,
      doi: body.doi
    });

    // Notify @mentions.
    const mentions = [...new Set((body.caption.match(/@([a-z0-9_.]{3,30})/gi) || []).map((m) => m.slice(1).toLowerCase()))].slice(0, 10);
    if (mentions.length) {
      const users = await db.query('SELECT id FROM users WHERE LOWER(username) = ANY($1) AND is_deleted IS NOT TRUE', [mentions]);
      for (const u of users.rows) {
        await notify({ userId: u.id, actorId: req.user.id, type: 'mention', entityType: 'post', entityId: post.id });
      }
    }

    return sendSuccess(res, post, 'Posted.', 201);
  } catch (error) {
    next(error);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    const isStaff = ['admin', 'moderator'].includes(req.user.role);
    const r = await db.query(
      `UPDATE posts SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL AND (author_id = $2 OR $3::boolean) RETURNING id`,
      [req.params.id, req.user.id, isStaff]
    );
    if (!r.rows.length) return sendError(res, 'Post not found or you cannot delete it.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, { id: req.params.id }, 'Post deleted.');
  } catch (error) {
    next(error);
  }
};

/** The post's author, or null when the post is gone or the viewer and author have blocked each other. */
const loadPostAuthor = async (postId, viewerId = null) => {
  const r = await db.query('SELECT author_id FROM posts WHERE id = $1 AND deleted_at IS NULL', [postId]);
  const post = r.rows[0] || null;
  if (post && viewerId && (await blockService.isBlockedEitherWay(viewerId, post.author_id))) return null;
  return post;
};

exports.like = async (req, res, next) => {
  try {
    const postId = req.params.id || req.body.post_id;
    if (!isUuid(postId)) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    const post = await loadPostAuthor(postId, req.user.id);
    if (!post) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    const ins = await db.query(
      `INSERT INTO reactions (post_id, user_id, reaction_type) VALUES ($1, $2, $3)
       ON CONFLICT (post_id, user_id) DO NOTHING RETURNING id`,
      [postId, req.user.id, req.body?.reaction_type || 'like']
    );
    if (ins.rows.length) {
      await notify({ userId: post.author_id, actorId: req.user.id, type: 'like', entityType: 'post', entityId: postId });
      analyticsService.trackEvent({ user_id: req.user.id, event_type: 'react_post', entity_id: postId, entity_type: 'post' }).catch(() => {});
    }
    const c = await db.query('SELECT COUNT(*)::int AS n FROM reactions WHERE post_id = $1', [postId]);
    return sendSuccess(res, { is_liked: true, like_count: c.rows[0].n }, 'Liked.');
  } catch (error) {
    next(error);
  }
};

exports.unlike = async (req, res, next) => {
  try {
    const postId = req.params.id;
    if (!isUuid(postId)) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    const post = await loadPostAuthor(postId);
    await db.query('DELETE FROM reactions WHERE post_id = $1 AND user_id = $2', [postId, req.user.id]);
    if (post) await retract({ userId: post.author_id, actorId: req.user.id, type: 'like', entityId: postId });
    const c = await db.query('SELECT COUNT(*)::int AS n FROM reactions WHERE post_id = $1', [postId]);
    return sendSuccess(res, { is_liked: false, like_count: c.rows[0].n }, 'Unliked.');
  } catch (error) {
    next(error);
  }
};

exports.bookmark = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id) || !(await loadPostAuthor(req.params.id, req.user.id))) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    await db.query('INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, req.params.id]);
    return sendSuccess(res, { is_bookmarked: true }, 'Saved.');
  } catch (error) {
    next(error);
  }
};

exports.unbookmark = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    await db.query('DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2', [req.user.id, req.params.id]);
    return sendSuccess(res, { is_bookmarked: false }, 'Removed from saved.');
  } catch (error) {
    next(error);
  }
};

exports.getSaved = async (req, res, next) => {
  try {
    const { limit, cursor } = parsePage(req.query, 20, 50);
    const params = [req.user.id, limit];
    let cursorSql = '';
    if (cursor) { params.push(cursor); cursorSql = 'AND b.created_at < $3'; }
    const r = await db.query(
      `${feedService.POST_SELECT.replace('FROM posts p', 'FROM bookmarks b JOIN posts p ON p.id = b.post_id').replace('SELECT p.id,', 'SELECT b.created_at AS saved_at, p.id,')}
        WHERE b.user_id = $1 AND p.deleted_at IS NULL AND ${blockService.notBlocked('$1::uuid', 'p.author_id')} ${cursorSql}
        ORDER BY b.created_at DESC LIMIT $2`,
      params
    );
    return sendSuccess(res, { posts: r.rows, nextCursor: nextCursorOf(r.rows, limit, 'saved_at') }, 'Saved posts.');
  } catch (error) {
    next(error);
  }
};

// ---- Comments: top-level comments with one level of replies ----------------

exports.getComments = async (req, res, next) => {
  try {
    const { sort, cursor, limit } = req.query;
    const page = await commentService.listTopLevel(req.params.id, { viewerId: req.user?.id, sort, cursor, limit });
    return sendSuccess(res, { comments: page.items, nextCursor: page.nextCursor }, 'Comments.');
  } catch (error) {
    next(error);
  }
};

exports.getReplies = async (req, res, next) => {
  try {
    const page = await commentService.listReplies(req.params.id, req.params.commentId, { viewerId: req.user?.id, cursor: req.query.cursor, limit: req.query.limit });
    return sendSuccess(res, { comments: page.items, nextCursor: page.nextCursor }, 'Replies.');
  } catch (error) {
    next(error);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const comment = await commentService.create({
      postId: req.params.id, authorId: req.user.id, content: req.body?.content, parentId: req.body?.parent_id || null
    });
    return sendSuccess(res, comment, 'Comment added.', 201);
  } catch (error) {
    next(error);
  }
};

exports.updateComment = async (req, res, next) => {
  try {
    const comment = await commentService.update({ postId: req.params.id, commentId: req.params.commentId, userId: req.user.id, content: req.body?.content });
    return sendSuccess(res, comment, 'Comment updated.');
  } catch (error) {
    next(error);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const ok = await commentService.remove({
      postId: req.params.id || null, commentId: req.params.commentId, userId: req.user.id,
      isStaff: ['admin', 'moderator'].includes(req.user.role)
    });
    if (!ok) return sendError(res, 'Comment not found or you cannot delete it.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, { id: req.params.commentId }, 'Comment deleted.');
  } catch (error) {
    next(error);
  }
};

exports.likeComment = async (req, res, next) => {
  try {
    const liked = req.method === 'POST';
    const comment = await commentService.getOne(req.params.commentId, req.user.id);
    if (comment && !comment.is_deleted && (await blockService.isBlockedEitherWay(req.user.id, comment.author_id))) {
      return sendError(res, 'Comment not found.', 404, 'NOT_FOUND', req);
    }
    return sendSuccess(res, await commentService.setLike({ postId: req.params.id, commentId: req.params.commentId, userId: req.user.id, liked }), liked ? 'Liked.' : 'Unliked.');
  } catch (error) {
    next(error);
  }
};

exports.viewPost = async (req, res) => {
  const postId = req.params.id || req.body?.post_id;
  if (isUuid(postId)) {
    analyticsService.trackEvent({ user_id: req.user?.id || null, event_type: 'view_post', entity_id: postId, entity_type: 'post' }).catch(() => {});
  }
  return sendSuccess(res, {}, 'View recorded.');
};
