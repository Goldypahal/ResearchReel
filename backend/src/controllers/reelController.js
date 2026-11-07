const db = require('../config/db');
const reelService = require('../services/reelGeneratorService');
const analyticsService = require('../services/analyticsService');
const storageService = require('../services/storageService');
const { notify, retract } = require('../services/notificationService');
const { notBlocked, notMuted } = require('../services/blockService');
const { moderateText } = require('../utils/moderator');
const { sendSuccess, sendError } = require('../utils/response');
const { parsePage, nextCursorOf, isUuid } = require('../utils/pagination');

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    if (error instanceof reelService.ReelError) return sendError(res, error.message, error.statusCode, error.code, req);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Drafts / generator (author only)
// ---------------------------------------------------------------------------
exports.getDrafts = handle(async (req, res) => sendSuccess(res, await reelService.getDrafts(req.user.id), 'Drafts.'));

exports.getDraft = handle(async (req, res) => {
  if (!isUuid(req.params.id)) return sendError(res, 'Draft not found.', 404, 'NOT_FOUND', req);
  const draft = await reelService.getDraftById(req.params.id, req.user.id);
  if (!draft) return sendError(res, 'Draft not found.', 404, 'NOT_FOUND', req);
  return sendSuccess(res, draft, 'Draft.');
});

exports.generateDraft = handle(async (req, res) => {
  const { document_id: documentId, split_mode, parts_mode, parts_count, title } = req.body;
  if (!isUuid(documentId)) return sendError(res, 'Choose a paper to generate a reel from.', 400, 'VALIDATION_ERROR', req);
  const draft = await reelService.generateDraftFromPaper(documentId, req.user.id, { split_mode, parts_mode, parts_count, title });
  return sendSuccess(res, draft, 'Draft generated.', 201);
});

exports.updateDraft = handle(async (req, res) => {
  if (!isUuid(req.params.id)) return sendError(res, 'Draft not found.', 404, 'NOT_FOUND', req);
  return sendSuccess(res, await reelService.updateDraft(req.params.id, req.user.id, req.body || {}), 'Draft saved.');
});

exports.deleteDraft = handle(async (req, res) => {
  if (!isUuid(req.params.id)) return sendError(res, 'Draft not found.', 404, 'NOT_FOUND', req);
  await reelService.deleteDraft(req.params.id, req.user.id);
  return sendSuccess(res, { id: req.params.id }, 'Draft deleted.');
});

exports.publishDraft = handle(async (req, res) => {
  if (!isUuid(req.params.id)) return sendError(res, 'Draft not found.', 404, 'NOT_FOUND', req);
  return sendSuccess(res, await reelService.publishDraft(req.params.id, req.user.id), 'Rendering started. We will notify you when your reel is live.', 202);
});

exports.getAutomation = handle(async (req, res) => sendSuccess(res, await reelService.getAutomationSettings(req.user.id), 'Automation settings.'));
exports.updateAutomation = handle(async (req, res) => sendSuccess(res, await reelService.updateAutomationSettings(req.user.id, req.body || {}), 'Automation settings saved.'));
exports.getDocuments = handle(async (req, res) => sendSuccess(res, await reelService.getUserDocuments(req.user.id), 'Your papers.'));

// ---------------------------------------------------------------------------
// Published reels (public)
// ---------------------------------------------------------------------------
const REEL_SELECT = `
  SELECT v.id, v.author_id, v.title, v.description, v.video_url, v.thumbnail_url, v.duration_seconds,
         v.linked_paper_id, v.tags, v.timestamps AS captions, v.created_at,
         u.username, u.full_name, u.profile_picture_url AS avatar_url, u.verification_status,
         COALESCE(d.title, d.file_name) AS paper_title,
         (SELECT COUNT(*)::int FROM video_likes l WHERE l.video_id = v.id) AS like_count,
         (SELECT COUNT(*)::int FROM video_comments c WHERE c.video_id = v.id AND c.deleted_at IS NULL) AS comment_count,
         (SELECT COUNT(*)::int FROM analytics_events e WHERE e.entity_id = v.id AND e.event_type = 'view_video') AS view_count,
         CASE WHEN $1::uuid IS NULL THEN FALSE ELSE EXISTS (SELECT 1 FROM video_likes l WHERE l.video_id = v.id AND l.user_id = $1::uuid) END AS is_liked,
         CASE WHEN $1::uuid IS NULL THEN FALSE ELSE EXISTS (SELECT 1 FROM video_saves s WHERE s.video_id = v.id AND s.user_id = $1::uuid) END AS is_saved,
         CASE WHEN $1::uuid IS NULL THEN FALSE ELSE EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1::uuid AND f.following_id = v.author_id) END AS is_following_author
    FROM videos v
    JOIN users u ON u.id = v.author_id AND u.is_deleted IS NOT TRUE
    LEFT JOIN documents d ON d.id = v.linked_paper_id AND d.deleted_at IS NULL
`;
exports.REEL_SELECT = REEL_SELECT;

exports.listReels = handle(async (req, res) => {
  const { limit, cursor } = parsePage(req.query, 10, 30);
  const params = [req.user?.id || null];
  const where = [`v.deleted_at IS NULL`, `v.status = 'published'`, `(v.visibility = 'public' OR v.author_id = $1::uuid)`, notBlocked('$1::uuid', 'v.author_id')];
  if (req.query.author) { params.push(String(req.query.author)); where.push(`LOWER(u.username) = LOWER($${params.length})`); }
  else where.push(notMuted('$1::uuid', 'v.author_id'));
  if (req.query.paper && isUuid(req.query.paper)) { params.push(req.query.paper); where.push(`v.linked_paper_id = $${params.length}`); }
  if (req.query.scope === 'following' && req.user) {
    where.push('(v.author_id = $1::uuid OR v.author_id IN (SELECT following_id FROM follows WHERE follower_id = $1::uuid))');
  }
  if (cursor) { params.push(cursor); where.push(`v.created_at < $${params.length}`); }
  params.push(limit);
  const r = await db.query(`${REEL_SELECT} WHERE ${where.join(' AND ')} ORDER BY v.created_at DESC LIMIT $${params.length}`, params);
  return sendSuccess(res, { reels: r.rows, nextCursor: nextCursorOf(r.rows, limit) }, 'Reels.');
});

exports.getSavedReels = handle(async (req, res) => {
  const r = await db.query(
    `${REEL_SELECT.replace('SELECT v.id,', 'SELECT s.created_at AS saved_at, v.id,')}
       JOIN video_saves s ON s.video_id = v.id AND s.user_id = $1::uuid
      WHERE v.deleted_at IS NULL AND ${notBlocked('$1::uuid', 'v.author_id')} ORDER BY s.created_at DESC LIMIT 100`,
    [req.user.id]
  );
  return sendSuccess(res, r.rows, 'Saved reels.');
});

exports.getReel = handle(async (req, res) => {
  if (!isUuid(req.params.id)) return sendError(res, 'Reel not found.', 404, 'NOT_FOUND', req);
  const r = await db.query(
    `${REEL_SELECT} WHERE v.id = $2 AND v.deleted_at IS NULL AND (v.visibility = 'public' OR v.author_id = $1::uuid) AND ${notBlocked('$1::uuid', 'v.author_id')}`,
    [req.user?.id || null, req.params.id]
  );
  if (!r.rows[0]) return sendError(res, 'Reel not found.', 404, 'NOT_FOUND', req);
  return sendSuccess(res, r.rows[0], 'Reel.');
});

/** A reel the viewer may see: public (or their own) and not from an account they are blocked with. */
const loadReel = async (id, viewerId = null, { includeHidden = false } = {}) => {
  if (!isUuid(id)) return null;
  const r = await db.query(
    `SELECT id, author_id, video_url, thumbnail_url FROM videos v
      WHERE id = $1 AND deleted_at IS NULL
        AND ($3::boolean OR visibility = 'public' OR author_id = $2::uuid)
        AND ($3::boolean OR ${notBlocked('$2::uuid', 'v.author_id')})`,
    [id, viewerId, includeHidden]
  );
  return r.rows[0] || null;
};

exports.deleteReel = handle(async (req, res) => {
  const reel = await loadReel(req.params.id, req.user.id, { includeHidden: true });
  const isStaff = ['admin', 'moderator'].includes(req.user.role);
  if (!reel || (reel.author_id !== req.user.id && !isStaff)) return sendError(res, 'Reel not found.', 404, 'NOT_FOUND', req);
  await db.query('UPDATE videos SET deleted_at = NOW() WHERE id = $1', [reel.id]);
  await db.query(`UPDATE posts SET deleted_at = NOW() WHERE content_type = 'video' AND $1 = ANY(media_urls) AND deleted_at IS NULL`, [reel.video_url]);
  for (const url of [reel.video_url, reel.thumbnail_url]) {
    if (url && url.startsWith('/uploads/')) await storageService.deleteFile(url.replace(/^\/uploads\//, ''));
  }
  return sendSuccess(res, { id: reel.id }, 'Reel deleted.');
});

const counts = async (id) => {
  const r = await db.query(
    `SELECT (SELECT COUNT(*)::int FROM video_likes WHERE video_id = $1) AS like_count,
            (SELECT COUNT(*)::int FROM video_saves WHERE video_id = $1) AS save_count`,
    [id]
  );
  return r.rows[0];
};

exports.like = handle(async (req, res) => {
  const reel = await loadReel(req.params.id, req.user.id);
  if (!reel) return sendError(res, 'Reel not found.', 404, 'NOT_FOUND', req);
  const ins = await db.query('INSERT INTO video_likes (video_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING 1', [reel.id, req.user.id]);
  if (ins.rows.length) await notify({ userId: reel.author_id, actorId: req.user.id, type: 'like', entityType: 'video', entityId: reel.id });
  return sendSuccess(res, { is_liked: true, ...(await counts(reel.id)) }, 'Liked.');
});

exports.unlike = handle(async (req, res) => {
  const reel = await loadReel(req.params.id, req.user.id);
  if (!reel) return sendError(res, 'Reel not found.', 404, 'NOT_FOUND', req);
  await db.query('DELETE FROM video_likes WHERE video_id = $1 AND user_id = $2', [reel.id, req.user.id]);
  await retract({ userId: reel.author_id, actorId: req.user.id, type: 'like', entityId: reel.id });
  return sendSuccess(res, { is_liked: false, ...(await counts(reel.id)) }, 'Unliked.');
});

exports.save = handle(async (req, res) => {
  const reel = await loadReel(req.params.id, req.user.id);
  if (!reel) return sendError(res, 'Reel not found.', 404, 'NOT_FOUND', req);
  await db.query('INSERT INTO video_saves (video_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [reel.id, req.user.id]);
  return sendSuccess(res, { is_saved: true }, 'Saved.');
});

exports.unsave = handle(async (req, res) => {
  const reel = await loadReel(req.params.id, req.user.id);
  if (!reel) return sendError(res, 'Reel not found.', 404, 'NOT_FOUND', req);
  await db.query('DELETE FROM video_saves WHERE video_id = $1 AND user_id = $2', [reel.id, req.user.id]);
  return sendSuccess(res, { is_saved: false }, 'Removed from saved.');
});

exports.getComments = handle(async (req, res) => {
  if (!(await loadReel(req.params.id, req.user?.id || null))) return sendError(res, 'Reel not found.', 404, 'NOT_FOUND', req);
  const r = await db.query(
    `SELECT c.id, c.video_id, c.content, c.created_at, c.author_id, u.username, u.full_name, u.profile_picture_url AS avatar_url
       FROM video_comments c JOIN users u ON u.id = c.author_id
      WHERE c.video_id = $1 AND c.deleted_at IS NULL AND ${notBlocked('$2::uuid', 'c.author_id')} ORDER BY c.created_at ASC LIMIT 500`,
    [req.params.id, req.user?.id || null]
  );
  return sendSuccess(res, r.rows, 'Comments.');
});

exports.addComment = handle(async (req, res) => {
  const reel = await loadReel(req.params.id, req.user.id);
  if (!reel) return sendError(res, 'Reel not found.', 404, 'NOT_FOUND', req);
  if (!moderateText(req.body.content).clean) return sendError(res, 'Your comment was blocked by our spam filter.', 400, 'CONTENT_REJECTED', req);
  const ins = await db.query('INSERT INTO video_comments (video_id, author_id, content) VALUES ($1, $2, $3) RETURNING id', [reel.id, req.user.id, req.body.content]);
  const r = await db.query(
    `SELECT c.id, c.video_id, c.content, c.created_at, c.author_id, u.username, u.full_name, u.profile_picture_url AS avatar_url
       FROM video_comments c JOIN users u ON u.id = c.author_id WHERE c.id = $1`,
    [ins.rows[0].id]
  );
  await notify({ userId: reel.author_id, actorId: req.user.id, type: 'comment', entityType: 'video', entityId: reel.id, message: req.body.content.slice(0, 140) });
  return sendSuccess(res, r.rows[0], 'Comment added.', 201);
});

exports.deleteComment = handle(async (req, res) => {
  if (!isUuid(req.params.commentId)) return sendError(res, 'Comment not found.', 404, 'NOT_FOUND', req);
  const isStaff = ['admin', 'moderator'].includes(req.user.role);
  const r = await db.query(
    `UPDATE video_comments c SET deleted_at = NOW() FROM videos v
      WHERE c.id = $1 AND v.id = c.video_id AND c.deleted_at IS NULL AND (c.author_id = $2 OR v.author_id = $2 OR $3::boolean)
      RETURNING c.id`,
    [req.params.commentId, req.user.id, isStaff]
  );
  if (!r.rows.length) return sendError(res, 'Comment not found.', 404, 'NOT_FOUND', req);
  return sendSuccess(res, { id: req.params.commentId }, 'Comment deleted.');
});

exports.view = handle(async (req, res) => {
  if (isUuid(req.params.id)) {
    analyticsService.trackEvent({ user_id: req.user?.id || null, event_type: 'view_video', entity_id: req.params.id, entity_type: 'video' }).catch(() => {});
  }
  return sendSuccess(res, {}, 'View recorded.');
});
