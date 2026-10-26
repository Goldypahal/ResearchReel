const feedService = require('../services/feedService');
const analyticsService = require('../services/analyticsService');
const PlagiarismService = require('../services/plagiarismService');
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

exports.getComments = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, await feedService.getComments(req.params.id, req.query), 'Comments fetched.');
  } catch (error) {
    next(error);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const content = String((req.body && req.body.content) || '').trim();
    if (!content) return sendError(res, 'Comment cannot be empty.', 400, 'VALIDATION_ERROR', req);
    if (content.length > 2000) return sendError(res, 'Comments are limited to 2000 characters.', 400, 'VALIDATION_ERROR', req);
    const mod = moderateText(content);
    if (!mod.clean) return sendError(res, 'Comment violates our community guidelines.', 400, 'CONTENT_POLICY', req);

    const post = await feedService.getPostById(req.params.id, null);
    if (!post) return sendError(res, 'Post not found.', 404, 'NOT_FOUND', req);

    const comment = await feedService.addComment({
      postId: post.id,
      authorId: req.user.id,
      content,
      parentId: isUuid(req.body.parent_id) ? req.body.parent_id : null
    });
    await notify({ userId: post.author_id, actorId: req.user.id, type: 'comment', entityType: 'post', entityId: post.id, message: content.slice(0, 140) });
    return sendSuccess(res, comment, 'Comment added.', 201);
  } catch (error) {
    next(error);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const ok = await feedService.deleteComment(req.params.commentId, req.user.id);
    if (!ok) return sendError(res, 'Comment not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, {}, 'Comment deleted.');
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

// Document Upload & Analysis (Section 4.1 / 4.2)
exports.uploadDocument = async (req, res) => {
  try {
    // 1. Check for Plagiarism before accepting document
    // We simulate extracting text and running it through the scanner
    const mockExtractedText = req.body.summary_text || req.body.title || "Sample research text...";
    const scanResult = await PlagiarismService.scanDocument(mockExtractedText);
    
    if (!scanResult.isOriginal) {
      return res.status(400).json({ 
        success: false, 
        message: 'Document rejected due to plagiarism checks failing.',
        similarityScore: scanResult.similarityScore,
        flaggedSections: scanResult.flaggedSections
      });
    }

    const docData = {
      ...req.body,
      uploader_id: req.user.id,
      is_verified: scanResult.isOriginal
    };
    
    const newDoc = await feedService.uploadDocument(docData);
    res.status(201).json({ success: true, data: newDoc, scanResult });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Document upload failed' });
  }
};

// Track view on post
exports.viewPost = async (req, res) => {
  const { post_id } = req.body;
  const user_id = req.user ? req.user.id : null;

  try {
    if (!post_id) {
      return res.status(400).json({ success: false, message: 'post_id is required' });
    }

    await analyticsService.trackEvent({
      user_id,
      event_type: 'view_post',
      entity_id: post_id,
      entity_type: 'post'
    });

    res.status(200).json({ success: true, message: 'Post view recorded' });
  } catch (error) {
    console.error('Failed to record post view:', error);
    res.status(500).json({ success: false, message: 'Failed to record view' });
  }
};

