const fs = require('fs');
const feedService = require('../services/feedService');
const analyticsService = require('../services/analyticsService');
const { moderateText } = require('../utils/moderator');

const { sendSuccess, sendError } = require('../utils/response');
const { notify } = require('../services/notificationService');
const db = require('../config/db');

const isUuid = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

// Feed: ?scope=following for people you follow, ?tag= to filter, cursor pagination
exports.getFeed = async (req, res, next) => {
  try {
    const { cursor, limit, scope, tag } = req.query;
    const result = await feedService.getFeed(cursor, limit, {
      viewerId: req.user ? req.user.id : null,
      scope: scope === 'following' && req.user ? 'following' : 'all',
      tag: tag || null
    });
    res.status(200).json({
      success: true,
      count: result.posts.length,
      data: result.posts,
      nextCursor: result.nextCursor
    });
  } catch (error) {
    next(error);
  }
};

exports.getTrending = async (req, res, next) => {
  try {
    const posts = await feedService.getTrending({ viewerId: req.user ? req.user.id : null, days: req.query.days, limit: req.query.limit });
    return sendSuccess(res, posts, 'Trending posts fetched.');
  } catch (error) {
    next(error);
  }
};

exports.getTrendingTags = async (req, res, next) => {
  try {
    return sendSuccess(res, await feedService.getTrendingTags({ days: req.query.days, limit: req.query.limit }), 'Trending tags fetched.');
  } catch (error) {
    next(error);
  }
};

exports.getSaved = async (req, res, next) => {
  try {
    const { posts, nextCursor } = await feedService.getBookmarked(req.user.id, req.query);
    res.status(200).json({ success: true, data: posts, nextCursor });
  } catch (error) {
    next(error);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    const post = await feedService.getPostById(req.params.id, req.user ? req.user.id : null);
    if (!post) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, post, 'Post fetched.');
  } catch (error) {
    next(error);
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const result = await db.query(
      'UPDATE posts SET deleted_at = NOW() WHERE id = $1 AND author_id = $2 AND deleted_at IS NULL RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rowCount) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, { id: req.params.id }, 'Post deleted.');
  } catch (error) {
    next(error);
  }
};

// ---- Comments (threaded: top-level comments with replies) --------------------

const commentService = require('../services/commentService');

exports.getComments = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    const { sort, cursor, limit } = req.query;
    const page = await commentService.listTopLevel(req.params.id, { viewerId: req.user?.id, sort, cursor, limit });
    return res.status(200).json({ success: true, data: page.items, nextCursor: page.nextCursor });
  } catch (error) {
    next(error);
  }
};

exports.getReplies = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    const page = await commentService.listReplies(req.params.id, req.params.commentId, { viewerId: req.user?.id, cursor: req.query.cursor, limit: req.query.limit });
    return res.status(200).json({ success: true, data: page.items, nextCursor: page.nextCursor });
  } catch (error) {
    next(error);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    const comment = await commentService.create({
      postId: req.params.id,
      authorId: req.user.id,
      content: req.body?.content,
      parentId: req.body?.parent_id || null,
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
    const ok = await commentService.remove({ postId: req.params.id, commentId: req.params.commentId, userId: req.user.id });
    if (!ok) return sendError(res, 'Comment not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, {}, 'Comment deleted.');
  } catch (error) {
    next(error);
  }
};

exports.likeComment = async (req, res, next) => {
  try {
    const liked = req.method === 'POST';
    return sendSuccess(res, await commentService.setLike({ postId: req.params.id, commentId: req.params.commentId, userId: req.user.id, liked }), liked ? 'Liked.' : 'Unliked.');
  } catch (error) {
    next(error);
  }
};

exports.bookmark = async (req, res, next) => {
  try {
    const post = await feedService.getPostById(req.params.id, null);
    if (!post) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, await feedService.setBookmark(req.user.id, post.id, true), 'Saved.');
  } catch (error) {
    next(error);
  }
};

exports.unbookmark = async (req, res, next) => {
  try {
    return sendSuccess(res, await feedService.setBookmark(req.user.id, req.params.id, false), 'Removed from saved.');
  } catch (error) {
    next(error);
  }
};

// Create Post (Step-by-step creation for text, image, doc, code)
exports.createPost = async (req, res) => {
  try {
    const { caption } = req.body;
    
    // Content Moderation check
    const modCheck = moderateText(caption || '');
    if (!modCheck.clean) {
      return res.status(400).json({
        success: false,
        message: `Post content violates our community guidelines (detected keyword: "${modCheck.matchedKeyword}").`
      });
    }

    const { content_type, caption: text, media_urls, document_id, tags, publication_status, doi } = req.body;
    // Media must be images this user uploaded via POST /posts/media — no arbitrary external URLs.
    const ownPrefix = `/uploads/posts/${req.user.id}/`;
    const badMedia = (media_urls || []).find((u) => {
      try { const url = new URL(u); return !/^https?:$/.test(url.protocol) || !url.pathname.startsWith(ownPrefix); } catch { return true; }
    });
    if (badMedia) return sendError(res, 'Images must be uploaded to ResearchReel first.', 400, 'VALIDATION_ERROR', req);
    if (content_type === 'image' && !(media_urls || []).length) return sendError(res, 'An image post needs at least one image.', 400, 'VALIDATION_ERROR', req);
    if (document_id) {
      const owned = await db.query(
        'SELECT 1 FROM documents WHERE id = $1 AND uploader_id = $2 AND deleted_at IS NULL',
        [document_id, req.user.id]
      );
      if (!owned.rowCount) return sendError(res, 'You can only attach papers from your own library.', 403, 'AUTHORIZATION_ERROR', req);
    }
    const postData = {
      content_type,
      caption: text || null,
      media_urls: media_urls || null,
      document_id: document_id || null,
      tags: (tags || []).map((t) => t.replace(/^#/, '').toLowerCase()),
      publication_status: publication_status || null,
      doi: doi || null,
      author_id: req.user.id
    };
    const newPost = await feedService.createPost(postData);
    const full = await feedService.getPostById(newPost.id, req.user.id);
    res.status(201).json({ success: true, data: full || newPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Post creation failed' });
  }
};

// React to Post: { post_id, reaction_type } — reaction_type null removes the reaction
exports.reactToPost = async (req, res, next) => {
  try {
    const { post_id, reaction_type } = req.body;
    const user_id = req.user.id;
    const post = isUuid(post_id) ? await feedService.getPostById(post_id, null) : null;
    if (!post) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);

    const applied = await feedService.reactToPost({ post_id, user_id, reaction_type: reaction_type || null });
    if (applied) {
      await notify({ userId: post.author_id, actorId: user_id, type: 'reaction', entityType: 'post', entityId: post_id, message: applied });
      await analyticsService.trackEvent({
        user_id,
        event_type: 'react_post',
        entity_id: post_id,
        entity_type: 'post',
        metadata: { reaction_type: applied }
      });
    }
    const updated = await feedService.getPostById(post_id, user_id);
    return sendSuccess(res, { post_id, viewer_reaction: applied, reaction_count: updated ? updated.reaction_count : 0 }, 'Reaction updated');
  } catch (error) {
    next(error);
  }
};

// Track view on post (deduplicated per viewer, so refreshes don't inflate counts)
exports.viewPost = async (req, res, next) => {
  try {
    const { post_id } = req.body || {};
    if (!isUuid(post_id)) return sendError(res, 'post_id is required.', 400, 'VALIDATION_ERROR', req);
    const counted = await analyticsService.recordView({
      viewerKey: req.user ? `u:${req.user.id}` : `ip:${req.ip}`,
      user_id: req.user ? req.user.id : null,
      event_type: 'view_post',
      entity_id: post_id,
      entity_type: 'post',
    });
    return sendSuccess(res, { counted }, 'View recorded.');
  } catch (error) {
    next(error);
  }
};



/**
 * Image attachments for posts (field "images", up to 4). Returns public URLs to
 * pass as media_urls when creating an image post.
 */
exports.uploadPostImages = async (req, res, next) => {
  const path = require('path');
  const crypto = require('crypto');
  const { sniffImage, readHead } = require('../utils/imageType');
  const { uploadsRoot } = require('../services/documentProcessor');
  const files = req.files || [];
  try {
    if (!files.length) return sendError(res, 'Attach at least one image in the "images" field.', 400, 'VALIDATION_ERROR', req);
    const dir = path.join(uploadsRoot, 'posts', req.user.id);
    fs.mkdirSync(dir, { recursive: true });
    const origin = (process.env.PUBLIC_API_ORIGIN || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const urls = [];
    for (const f of files) {
      const ext = sniffImage(readHead(fs, f.path));
      if (!ext) return sendError(res, `${f.originalname} is not a JPG, PNG, WebP or GIF image.`, 400, 'UNSUPPORTED_FILE', req);
    }
    for (const f of files) {
      const ext = sniffImage(readHead(fs, f.path));
      const name = `${crypto.randomUUID()}${ext}`;
      fs.renameSync(f.path, path.join(dir, name));
      urls.push(`${origin}/uploads/posts/${req.user.id}/${name}`);
    }
    return sendSuccess(res, { urls }, 'Images uploaded.', 201);
  } catch (error) {
    next(error);
  } finally {
    for (const f of files) if (f.path && fs.existsSync(f.path)) fs.unlink(f.path, () => {});
  }
};
