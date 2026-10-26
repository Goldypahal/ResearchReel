const reelService = require('../services/reelGeneratorService');
const { canAccessDocument } = require('../authorization/documentAuthorization');
const { canAccessReel } = require('../authorization/reelAuthorization');
const { sendSuccess, sendError } = require('../utils/response');
const db = require('../config/db');
const analyticsService = require('../services/analyticsService');

/** Published reels, newest first. ?author=username narrows to one creator. */
exports.getReelFeed = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 30);
    const params = [limit, req.user ? req.user.id : null];
    const where = ['v.deleted_at IS NULL'];
    if (req.query.cursor) {
      params.push(req.query.cursor);
      where.push(`v.created_at < $${params.length}`);
    }
    if (req.query.author) {
      params.push(req.query.author);
      where.push(`lower(u.username) = lower($${params.length})`);
    }
    const result = await db.query(
      `SELECT v.id, v.title, v.description, v.video_url, v.hls_playlist_url, v.thumbnail_url,
              v.duration_seconds, v.tags, v.view_count, v.created_at, v.linked_paper_id,
              d.title AS paper_title, d.doi AS paper_doi,
              u.id AS author_id, u.username, u.full_name, u.verification_status,
              COALESCE(u.avatar_url, u.profile_picture_url) AS avatar_url,
              ($2::uuid IS NOT NULL AND EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $2 AND f.following_id = u.id)) AS is_following
       FROM videos v
       JOIN users u ON u.id = v.author_id
       LEFT JOIN documents d ON d.id = v.linked_paper_id
       WHERE ${where.join(' AND ')}
       ORDER BY v.created_at DESC
       LIMIT $1`,
      params
    );
    const rows = result.rows;
    res.status(200).json({
      success: true,
      data: rows,
      nextCursor: rows.length === limit ? rows[rows.length - 1].created_at.toISOString() : null
    });
  } catch (error) {
    next(error);
  }
};

exports.recordReelView = async (req, res, next) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return sendError(res, 'Reel not found.', 404, 'NOT_FOUND', req);
    const counted = await analyticsService.recordView({
      viewerKey: req.user ? `u:${req.user.id}` : `ip:${req.ip}`,
      user_id: req.user ? req.user.id : null,
      event_type: 'view_reel',
      entity_id: req.params.id,
      entity_type: 'video',
    });
    if (counted) {
      await db.query('UPDATE videos SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    }
    return sendSuccess(res, { counted }, 'View recorded.');
  } catch (error) {
    next(error);
  }
};

exports.getDrafts = async (req, res, next) => {
  try {
    const drafts = await reelService.getDrafts(req.user.id);
    return sendSuccess(res, drafts, 'User reel drafts retrieved.');
  } catch (error) {
    next(error);
  }
};

exports.getDraft = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allowed } = await canAccessReel(req.user.id, id);
    if (!allowed) {
      return sendError(res, 'Forbidden: You do not have access to this reel draft.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const draft = await reelService.getDraftById(id, req.user.id);
    if (!draft) {
      return sendError(res, 'Reel draft not found.', 404, 'NOT_FOUND', req);
    }
    return sendSuccess(res, draft, 'Reel draft fetched.');
  } catch (error) {
    next(error);
  }
};

exports.generateDraft = async (req, res, next) => {
  try {
    const { document_id, split_mode, parts_mode, parts_count, title } = req.body;
    if (!document_id) {
      return sendError(res, 'document_id is required.', 400, 'VALIDATION_ERROR', req);
    }

    // Document access authorization check (Section 33)
    const { allowed } = await canAccessDocument(req.user.id, document_id);
    if (!allowed) {
      return sendError(res, 'Forbidden: You do not have access to this document.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const draft = await reelService.generateDraftFromPaper(document_id, req.user.id, {
      split_mode,
      parts_mode,
      parts_count,
      title
    });

    // Scripts are generated synchronously; rendering happens on publish.
    return sendSuccess(res, draft, Array.isArray(draft) ? `Created ${draft.length} drafts.` : 'Reel draft created.', 201);
  } catch (error) {
    next(error);
  }
};

exports.updateDraft = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allowed, isAuthor } = await canAccessReel(req.user.id, id);
    if (!allowed || !isAuthor) {
      return sendError(res, 'Forbidden: Only the reel author can update this draft.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const draft = await reelService.updateDraft(id, req.user.id, req.body);
    return sendSuccess(res, draft, 'Reel draft updated.');
  } catch (error) {
    next(error);
  }
};

exports.deleteDraft = async (req, res, next) => {
  try {
    const { allowed, isAuthor } = await canAccessReel(req.user.id, req.params.id);
    if (!allowed || !isAuthor) return sendError(res, 'Draft not found.', 404, 'NOT_FOUND', req);
    await reelService.deleteDraft(req.params.id, req.user.id);
    return sendSuccess(res, { id: req.params.id }, 'Draft deleted.');
  } catch (error) {
    next(error);
  }
};

exports.publishDraft = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allowed, isAuthor } = await canAccessReel(req.user.id, id);
    if (!allowed || !isAuthor) {
      return sendError(res, 'Forbidden: Only the reel author can publish this draft.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const result = await reelService.publishDraft(id, req.user.id);
    return sendSuccess(res, result, 'Reel published successfully.');
  } catch (error) {
    next(error);
  }
};

exports.getAutomation = async (req, res, next) => {
  try {
    const settings = await reelService.getAutomationSettings(req.user.id);
    return sendSuccess(res, settings, 'Reel automation settings retrieved.');
  } catch (error) {
    next(error);
  }
};

exports.updateAutomation = async (req, res, next) => {
  try {
    const settings = await reelService.updateAutomationSettings(req.user.id, req.body);
    return sendSuccess(res, settings, 'Reel automation settings updated.');
  } catch (error) {
    next(error);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const documents = await reelService.getUserDocuments(req.user.id);
    return sendSuccess(res, documents, 'Available user documents fetched.');
  } catch (error) {
    next(error);
  }
};
