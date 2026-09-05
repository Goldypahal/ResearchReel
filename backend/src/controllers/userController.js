const userRepository = require('../repositories/userRepository');
const db = require('../config/db');
const analyticsService = require('../services/analyticsService');
const { sendSuccess, sendError } = require('../utils/response');

// Get Public User Profile (Section 12 - Explicit safe columns)
exports.getProfile = async (req, res, next) => {
  const { username } = req.params;

  try {
    const profile = await userRepository.findByUsername(username);
    if (!profile) {
      return sendError(res, 'User not found.', 404, 'NOT_FOUND', req);
    }

    // Additional aggregated counts
    const countsRes = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM posts p WHERE p.author_id = $1 AND p.deleted_at IS NULL) as post_count,
        (SELECT COUNT(*) FROM reels r WHERE r.author_id = $1 AND r.deleted_at IS NULL) as reel_count
    `, [profile.id]);

    const counts = countsRes.rows[0] || {};
    return sendSuccess(res, { ...profile, ...counts }, 'Profile fetched successfully.');
  } catch (error) {
    next(error);
  }
};

// Get Current Authenticated User Profile
exports.getMe = async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (!user) {
      return sendError(res, 'User profile not found.', 404, 'NOT_FOUND', req);
    }
    return sendSuccess(res, user, 'Authenticated profile fetched.');
  } catch (error) {
    next(error);
  }
};

// Get User Analytics (Section 40 - restricted to req.user.id)
exports.getAnalytics = async (req, res, next) => {
  try {
    const targetUserId = req.params.user_id || req.user.id;
    if (targetUserId !== req.user.id && req.user.role !== 'admin') {
      return sendError(res, 'Forbidden: Cannot access another user\'s private analytics', 403, 'AUTHORIZATION_ERROR', req);
    }

    const analytics = await analyticsService.getProfileAnalytics(targetUserId);
    return sendSuccess(res, analytics, 'Analytics data retrieved.');
  } catch (error) {
    next(error);
  }
};

// Update Profile
exports.updateProfile = async (req, res, next) => {
  const { bio, research_interests, full_name, institution } = req.body;
  const user_id = req.user.id;

  try {
    const updatedUser = await db.query(
      `UPDATE users 
       SET bio = COALESCE($1, bio), 
           research_interests = COALESCE($2, research_interests),
           full_name = COALESCE($3, full_name),
           institution = COALESCE($4, institution),
           updated_at = NOW() 
       WHERE id = $5 
       RETURNING id, username, full_name, avatar_url, bio, institution, research_interests, updated_at`,
      [bio, research_interests, full_name, institution, user_id]
    );

    return sendSuccess(res, updatedUser.rows[0], 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
};
