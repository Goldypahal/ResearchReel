const db = require('../config/db');
const storageService = require('../services/storageService');
const { moderateText } = require('../utils/moderator');
const { sendSuccess, sendError } = require('../utils/response');
const { isUuid } = require('../utils/pagination');

const GRADIENT_RE = /^[a-z0-9\-\s/[\]#]{1,120}$/i;

/**
 * Active stories (last 24h) from people you follow plus your own, grouped by author.
 * Signed-out visitors see the most recent public stories.
 */
exports.list = async (req, res, next) => {
  try {
    const viewer = req.user?.id || null;
    const r = await db.query(
      `SELECT s.id, s.author_id, s.text, s.gradient, s.media_url, s.created_at, s.expires_at,
              u.username, u.full_name, u.profile_picture_url AS avatar_url,
              CASE WHEN $1::uuid IS NULL THEN FALSE
                   ELSE EXISTS (SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.user_id = $1::uuid) END AS viewed
         FROM stories s JOIN users u ON u.id = s.author_id AND u.is_deleted IS NOT TRUE
        WHERE s.expires_at > NOW()
          AND ($1::uuid IS NULL OR s.author_id = $1::uuid
               OR s.author_id IN (SELECT following_id FROM follows WHERE follower_id = $1::uuid))
        ORDER BY (s.author_id = $1::uuid) DESC, s.created_at ASC
        LIMIT 300`,
      [viewer]
    );
    const groups = new Map();
    for (const s of r.rows) {
      if (!groups.has(s.author_id)) {
        groups.set(s.author_id, { author_id: s.author_id, username: s.username, full_name: s.full_name, avatar_url: s.avatar_url, is_self: s.author_id === viewer, stories: [] });
      }
      groups.get(s.author_id).stories.push(s);
    }
    const list = [...groups.values()].map((g) => ({ ...g, all_viewed: g.stories.every((s) => s.viewed) }));
    list.sort((a, b) => (b.is_self - a.is_self) || (a.all_viewed - b.all_viewed));
    return sendSuccess(res, list, 'Stories.');
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const text = String(req.body.text || '').trim().slice(0, 500);
    const gradient = String(req.body.gradient || '').trim();
    if (!text && !req.file) return sendError(res, 'Add some text or an image to your story.', 400, 'VALIDATION_ERROR', req);
    if (!moderateText(text).clean) return sendError(res, 'Your story was blocked by our spam filter.', 400, 'CONTENT_REJECTED', req);
    let mediaUrl = null;
    if (req.file) {
      const saved = await storageService.saveFile({ buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype, folder: 'stories' });
      mediaUrl = saved.url;
    }
    const r = await db.query(
      `INSERT INTO stories (author_id, text, gradient, media_url) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, text || null, GRADIENT_RE.test(gradient) ? gradient : null, mediaUrl]
    );
    return sendSuccess(res, r.rows[0], 'Story shared.', 201);
  } catch (error) {
    next(error);
  }
};

exports.markViewed = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Story not found.', 404, 'NOT_FOUND', req);
    await db.query(
      `INSERT INTO story_views (story_id, user_id) SELECT id, $2 FROM stories WHERE id = $1 AND expires_at > NOW() ON CONFLICT DO NOTHING`,
      [req.params.id, req.user.id]
    );
    return sendSuccess(res, {}, 'Viewed.');
  } catch (error) {
    next(error);
  }
};

exports.viewers = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Story not found.', 404, 'NOT_FOUND', req);
    const own = await db.query('SELECT 1 FROM stories WHERE id = $1 AND author_id = $2', [req.params.id, req.user.id]);
    if (!own.rows.length) return sendError(res, 'Story not found.', 404, 'NOT_FOUND', req);
    const r = await db.query(
      `SELECT u.username, u.full_name, u.profile_picture_url AS avatar_url, sv.viewed_at
         FROM story_views sv JOIN users u ON u.id = sv.user_id WHERE sv.story_id = $1 ORDER BY sv.viewed_at DESC`,
      [req.params.id]
    );
    return sendSuccess(res, r.rows, 'Viewers.');
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Story not found.', 404, 'NOT_FOUND', req);
    const r = await db.query('DELETE FROM stories WHERE id = $1 AND author_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (!r.rows.length) return sendError(res, 'Story not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, { id: req.params.id }, 'Story deleted.');
  } catch (error) {
    next(error);
  }
};
