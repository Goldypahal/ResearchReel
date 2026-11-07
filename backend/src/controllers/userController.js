const db = require('../config/db');
const userRepository = require('../repositories/userRepository');
const { PUBLIC_USER } = require('../repositories/userRepository');
const analyticsService = require('../services/analyticsService');
const storageService = require('../services/storageService');
const sessionRepository = require('../repositories/sessionRepository');
const { notify, retract } = require('../services/notificationService');
const { sendSuccess, sendError } = require('../utils/response');
const { parsePage, nextCursorOf } = require('../utils/pagination');
const blockService = require('../services/blockService');
const { notBlocked } = blockService;

exports.getProfile = async (req, res, next) => {
  try {
    const profile = await userRepository.findByUsername(req.params.username, req.user?.id || null);
    // Someone who blocked you looks like they don't exist.
    if (!profile || profile.blocked_viewer) return sendError(res, 'User not found.', 404, 'NOT_FOUND', req);
    const { blocked_viewer, ...rest } = profile;
    if (rest.is_blocked) {
      // You blocked them: show only enough to recognise and unblock the account.
      return sendSuccess(res, {
        id: rest.id, username: rest.username, full_name: rest.full_name, avatar_url: rest.avatar_url,
        verification_status: rest.verification_status, is_blocked: true, is_muted: rest.is_muted, is_self: false,
        followers_count: 0, following_count: 0, post_count: 0, reel_count: 0, paper_count: 0, is_following: false, follows_you: false
      }, 'Profile fetched.');
    }
    return sendSuccess(res, { ...rest, is_self: req.user?.id === rest.id }, 'Profile fetched.');
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (!user) return sendError(res, 'User profile not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, { ...user, profile_picture_url: user.avatar_url }, 'Authenticated profile fetched.');
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const targetUserId = req.params.user_id || req.user.id;
    if (targetUserId !== req.user.id && req.user.role !== 'admin') {
      return sendError(res, 'You can only view your own analytics.', 403, 'AUTHORIZATION_ERROR', req);
    }
    const analytics = await analyticsService.getProfileAnalytics(targetUserId);
    return sendSuccess(res, analytics, 'Analytics data retrieved.');
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  const { bio, research_interests, full_name, institution, website, username } = req.body;
  try {
    if (username) {
      const taken = await db.query('SELECT 1 FROM users WHERE LOWER(username) = $1 AND id <> $2', [username, req.user.id]);
      if (taken.rows.length) return sendError(res, 'That username is already taken.', 409, 'CONFLICT_ERROR', req);
    }
    await db.query(
      `UPDATE users
          SET bio = CASE WHEN $1::boolean THEN $2 ELSE bio END,
              research_interests = COALESCE($3, research_interests),
              full_name = COALESCE($4, full_name),
              institution = CASE WHEN $5::boolean THEN $6 ELSE institution END,
              website = CASE WHEN $7::boolean THEN $8 ELSE website END,
              username = COALESCE($9, username),
              updated_at = NOW()
        WHERE id = $10`,
      [bio !== undefined, bio || null, research_interests || null, full_name || null,
        institution !== undefined, institution || null, website !== undefined, website || null,
        username || null, req.user.id]
    );
    const user = await userRepository.findById(req.user.id);
    return sendSuccess(res, { ...user, profile_picture_url: user.avatar_url }, 'Profile updated.');
  } catch (error) {
    next(error);
  }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'Choose an image to upload.', 400, 'VALIDATION_ERROR', req);
    const saved = await storageService.saveFile({
      buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype, folder: 'avatars'
    });
    await db.query('UPDATE users SET profile_picture_url = $1, updated_at = NOW() WHERE id = $2', [saved.url, req.user.id]);
    return sendSuccess(res, { avatar_url: saved.url, profile_picture_url: saved.url }, 'Profile photo updated.');
  } catch (error) {
    next(error);
  }
};

exports.removeAvatar = async (req, res, next) => {
  try {
    await db.query('UPDATE users SET profile_picture_url = NULL, updated_at = NOW() WHERE id = $1', [req.user.id]);
    return sendSuccess(res, { avatar_url: null }, 'Profile photo removed.');
  } catch (error) {
    next(error);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const id = req.user.id;
    // Anonymise rather than hard-delete so that conversations/threads stay consistent.
    await db.query(
      `UPDATE users SET is_deleted = TRUE, deleted_at = NOW(), email = 'deleted+' || id || '@researchreel.invalid',
              username = 'deleted_' || substr(replace(id::text, '-', ''), 1, 12), full_name = 'Deleted user',
              bio = NULL, profile_picture_url = NULL, password_hash = NULL, orcid_id = NULL, updated_at = NOW()
        WHERE id = $1`,
      [id]
    );
    await db.query('UPDATE posts SET deleted_at = NOW() WHERE author_id = $1 AND deleted_at IS NULL', [id]);
    await db.query('UPDATE videos SET deleted_at = NOW() WHERE author_id = $1 AND deleted_at IS NULL', [id]);
    await db.query('DELETE FROM follows WHERE follower_id = $1 OR following_id = $1', [id]);
    await sessionRepository.revokeAllUserSessions(id);
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    return sendSuccess(res, {}, 'Your account has been deleted.');
  } catch (error) {
    next(error);
  }
};

const resolveUser = async (username) => {
  const r = await db.query('SELECT id, username FROM users WHERE LOWER(username) = LOWER($1) AND is_deleted IS NOT TRUE', [username]);
  return r.rows[0] || null;
};

exports.follow = async (req, res, next) => {
  try {
    const target = await resolveUser(req.params.username);
    if (!target) return sendError(res, 'User not found.', 404, 'NOT_FOUND', req);
    if (await blockService.isBlockedEitherWay(req.user.id, target.id)) {
      return sendError(res, "You can't follow this account.", 403, 'BLOCKED', req);
    }
    if (target.id === req.user.id) return sendError(res, 'You cannot follow yourself.', 400, 'VALIDATION_ERROR', req);
    const ins = await db.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING 1',
      [req.user.id, target.id]
    );
    if (ins.rows.length) {
      await notify({ userId: target.id, actorId: req.user.id, type: 'follow', entityType: 'user', entityId: req.user.id });
    }
    const c = await db.query('SELECT COUNT(*)::int AS n FROM follows WHERE following_id = $1', [target.id]);
    return sendSuccess(res, { is_following: true, followers_count: c.rows[0].n }, `You are now following @${target.username}.`);
  } catch (error) {
    next(error);
  }
};

exports.unfollow = async (req, res, next) => {
  try {
    const target = await resolveUser(req.params.username);
    if (!target) return sendError(res, 'User not found.', 404, 'NOT_FOUND', req);
    await db.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [req.user.id, target.id]);
    await retract({ userId: target.id, actorId: req.user.id, type: 'follow', entityId: req.user.id });
    const c = await db.query('SELECT COUNT(*)::int AS n FROM follows WHERE following_id = $1', [target.id]);
    return sendSuccess(res, { is_following: false, followers_count: c.rows[0].n }, `Unfollowed @${target.username}.`);
  } catch (error) {
    next(error);
  }
};

const listFollows = (direction) => async (req, res, next) => {
  try {
    const target = await resolveUser(req.params.username);
    if (!target) return sendError(res, 'User not found.', 404, 'NOT_FOUND', req);
    const { limit, cursor } = parsePage(req.query, 30, 100);
    const joinCol = direction === 'followers' ? 'f.follower_id' : 'f.following_id';
    const whereCol = direction === 'followers' ? 'f.following_id' : 'f.follower_id';
    const params = [target.id, req.user?.id || null, limit];
    let cursorSql = '';
    if (cursor) { params.push(cursor); cursorSql = 'AND f.created_at < $4'; }
    const r = await db.query(
      `SELECT ${PUBLIC_USER}, f.created_at AS followed_at,
              CASE WHEN $2::uuid IS NULL THEN FALSE
                   ELSE EXISTS (SELECT 1 FROM follows x WHERE x.follower_id = $2::uuid AND x.following_id = u.id) END AS is_following
         FROM follows f JOIN users u ON u.id = ${joinCol}
        WHERE ${whereCol} = $1 AND u.is_deleted IS NOT TRUE AND ${notBlocked('$2::uuid', 'u.id')} ${cursorSql}
        ORDER BY f.created_at DESC
        LIMIT $3`,
      params
    );
    return sendSuccess(res, { users: r.rows, nextCursor: nextCursorOf(r.rows, limit, 'followed_at') }, `${direction} retrieved.`);
  } catch (error) {
    next(error);
  }
};


/** People you may know: shared interests and friends-of-friends, excluding people already followed. */
exports.getSuggestions = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 30);
    const viewer = req.user?.id || null;
    const r = await db.query(
      `SELECT ${PUBLIC_USER},
              (SELECT COUNT(*)::int FROM follows f WHERE f.following_id = u.id) AS followers_count,
              (CASE WHEN $1::uuid IS NULL THEN 0 ELSE
                 (SELECT COUNT(*) FROM follows a JOIN follows b ON b.follower_id = a.following_id
                   WHERE a.follower_id = $1::uuid AND b.following_id = u.id) END)::int AS mutual_count,
              (CASE WHEN $1::uuid IS NULL THEN 0 ELSE
                 COALESCE(cardinality(ARRAY(SELECT unnest(u.research_interests) INTERSECT
                   SELECT unnest(me.research_interests))), 0) END)::int AS shared_interests
         FROM users u
         LEFT JOIN users me ON me.id = $1::uuid
        WHERE u.is_deleted IS NOT TRUE AND u.email_verified IS TRUE
          AND ($1::uuid IS NULL OR u.id <> $1::uuid)
          AND ($1::uuid IS NULL OR NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1::uuid AND f.following_id = u.id))
          AND ${notBlocked('$1::uuid', 'u.id')}
        ORDER BY mutual_count DESC, shared_interests DESC, followers_count DESC, u.created_at DESC
        LIMIT $2`,
      [viewer, limit]
    );
    return sendSuccess(res, r.rows, 'Suggested researchers.');
  } catch (error) {
    next(error);
  }
};

/** A profile's follower list hides accounts the viewer is blocked with; the profile itself 404s if they blocked you. */
const guardBlockedTarget = async (req, res) => {
  if (!req.user) return true;
  const target = await resolveUser(req.params.username);
  if (target && (await blockService.isBlockedEitherWay(req.user.id, target.id))) {
    const r = await db.query('SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [target.id, req.user.id]);
    if (r.rows.length) { sendError(res, 'User not found.', 404, 'NOT_FOUND', req); return false; }
  }
  return true;
};
exports.getFollowers = async (req, res, next) => { try { if (await guardBlockedTarget(req, res)) return listFollows('followers')(req, res, next); } catch (e) { next(e); } };
exports.getFollowing = async (req, res, next) => { try { if (await guardBlockedTarget(req, res)) return listFollows('following')(req, res, next); } catch (e) { next(e); } };

const blockAction = (fn, message) => async (req, res, next) => {
  try {
    return sendSuccess(res, await fn(req.user.id, req.params.username), message);
  } catch (error) {
    next(error);
  }
};
exports.block = blockAction(blockService.block, 'Account blocked.');
exports.unblock = blockAction(blockService.unblock, 'Account unblocked.');
exports.mute = blockAction(blockService.mute, 'Account muted.');
exports.unmute = blockAction(blockService.unmute, 'Account unmuted.');
exports.listBlocks = async (req, res, next) => {
  try {
    return sendSuccess(res, await blockService.list(req.user.id), 'Blocked and muted accounts.');
  } catch (error) {
    next(error);
  }
};
