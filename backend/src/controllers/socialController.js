const socialService = require('../services/socialService');
const feedService = require('../services/feedService');
const notificationService = require('../services/notificationService');
const storyService = require('../services/storyService');
const blockService = require('../services/blockService');
const { sendSuccess, sendError } = require('../utils/response');

const viewer = (req) => (req.user ? req.user.id : null);
const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    next(err);
  }
};

// ---- Users -------------------------------------------------------------
exports.getProfile = wrap(async (req, res) => {
  const profile = await socialService.getProfile(req.params.username, viewer(req));
  return sendSuccess(res, profile, 'Profile fetched.');
});

exports.getUserPosts = wrap(async (req, res) => {
  const profile = await socialService.getProfile(req.params.username, viewer(req));
  const { posts, nextCursor } = await feedService.getFeed(req.query.cursor, req.query.limit, {
    viewerId: viewer(req),
    authorId: profile.id
  });
  return res.status(200).json({ success: true, data: posts, nextCursor });
});

exports.follow = wrap(async (req, res) => {
  return sendSuccess(res, await socialService.follow(req.user.id, req.params.username), 'Followed.');
});

exports.unfollow = wrap(async (req, res) => {
  return sendSuccess(res, await socialService.unfollow(req.user.id, req.params.username), 'Unfollowed.');
});

exports.getFollowers = wrap(async (req, res) => {
  const rows = await socialService.listConnections(req.params.username, 'followers', viewer(req), req.query);
  return sendSuccess(res, rows, 'Followers fetched.');
});

exports.getFollowing = wrap(async (req, res) => {
  const rows = await socialService.listConnections(req.params.username, 'following', viewer(req), req.query);
  return sendSuccess(res, rows, 'Following fetched.');
});

exports.getSuggestions = wrap(async (req, res) => {
  return sendSuccess(res, await socialService.suggestions(req.user.id, req.query.limit), 'Suggestions fetched.');
});

exports.searchUsers = wrap(async (req, res) => {
  return sendSuccess(res, await socialService.searchUsers(req.query.q, viewer(req), req.query.limit), 'Users found.');
});

exports.getLeaderboard = wrap(async (req, res) => {
  const { period, field, limit } = req.query;
  return sendSuccess(res, await socialService.leaderboard(viewer(req), { period, field, limit }), 'Leaderboard fetched.');
});

exports.getAchievements = wrap(async (req, res) => {
  return sendSuccess(res, await socialService.achievements(req.user.id), 'Achievements fetched.');
});

// ---- Notifications -----------------------------------------------------
exports.listNotifications = wrap(async (req, res) => {
  const { notifications, nextCursor } = await notificationService.list(req.user.id, req.query);
  const unread = await notificationService.unreadCount(req.user.id);
  return res.status(200).json({ success: true, data: notifications, nextCursor, unreadCount: unread });
});

exports.unreadNotifications = wrap(async (req, res) => {
  return sendSuccess(res, { count: await notificationService.unreadCount(req.user.id) }, 'Unread count.');
});

exports.markNotificationRead = wrap(async (req, res) => {
  const ok = await notificationService.markRead(req.user.id, req.params.id);
  if (!ok) return sendError(res, 'Notification not found.', 404, 'NOT_FOUND', req);
  return sendSuccess(res, { id: req.params.id }, 'Marked as read.');
});

exports.markAllNotificationsRead = wrap(async (req, res) => {
  await notificationService.markAllRead(req.user.id);
  return sendSuccess(res, {}, 'All notifications marked as read.');
});

// ---- Stories -----------------------------------------------------------
exports.listStories = wrap(async (req, res) => {
  return sendSuccess(res, await storyService.feed(req.user.id), 'Stories fetched.');
});

exports.createStory = wrap(async (req, res) => {
  return sendSuccess(res, await storyService.create(req.user.id, req.body || {}), 'Story posted.', 201);
});

exports.viewStory = wrap(async (req, res) => {
  await storyService.markViewed(req.user.id, req.params.id);
  return sendSuccess(res, {}, 'Story viewed.');
});

exports.deleteStory = wrap(async (req, res) => {
  const ok = await storyService.remove(req.user.id, req.params.id);
  if (!ok) return sendError(res, 'Story not found.', 404, 'NOT_FOUND', req);
  return sendSuccess(res, {}, 'Story deleted.');
});

// ---- Blocking and muting --------------------------------------------------
exports.listBlocked = wrap(async (req, res) => sendSuccess(res, await blockService.list(req.user.id), 'Blocked and muted accounts.'));
exports.block = wrap(async (req, res) => sendSuccess(res, await blockService.block(req.user.id, req.params.username), 'Blocked.'));
exports.unblock = wrap(async (req, res) => sendSuccess(res, await blockService.unblock(req.user.id, req.params.username), 'Unblocked.'));
exports.mute = wrap(async (req, res) => sendSuccess(res, await blockService.mute(req.user.id, req.params.username), 'Muted.'));
exports.unmute = wrap(async (req, res) => sendSuccess(res, await blockService.unmute(req.user.id, req.params.username), 'Unmuted.'));
