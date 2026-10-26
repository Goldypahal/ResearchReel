const userRepository = require('../repositories/userRepository');
const db = require('../config/db');
const analyticsService = require('../services/analyticsService');
const { sendSuccess, sendError } = require('../utils/response');

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

    const analytics = await analyticsService.getProfileAnalytics(targetUserId, req.query.days);
    return sendSuccess(res, analytics, 'Analytics data retrieved.');
  } catch (error) {
    next(error);
  }
};

// Update Profile: only the caller's own editable fields
exports.updateProfile = async (req, res, next) => {
  const { bio, research_interests, full_name, institution, avatar_url } = req.body || {};
  const user_id = req.user.id;

  try {
    if (full_name !== undefined && (typeof full_name !== 'string' || !full_name.trim() || full_name.length > 100)) {
      return sendError(res, 'Full name must be 1-100 characters.', 400, 'VALIDATION_ERROR', req);
    }
    if (bio !== undefined && (typeof bio !== 'string' || bio.length > 500)) {
      return sendError(res, 'Bio is limited to 500 characters.', 400, 'VALIDATION_ERROR', req);
    }
    if (research_interests !== undefined && (!Array.isArray(research_interests) || research_interests.length > 15)) {
      return sendError(res, 'Research interests must be a list of up to 15 topics.', 400, 'VALIDATION_ERROR', req);
    }
    if (avatar_url !== undefined && avatar_url !== null && !/^https?:\/\//.test(String(avatar_url))) {
      return sendError(res, 'Avatar must be an http(s) URL.', 400, 'VALIDATION_ERROR', req);
    }
    const interests = research_interests === undefined
      ? null
      : research_interests.map((t) => String(t).trim()).filter(Boolean).slice(0, 15);

    const updatedUser = await db.query(
      `UPDATE users
       SET bio = COALESCE($1, bio),
           research_interests = COALESCE($2, research_interests),
           full_name = COALESCE($3, full_name),
           institution = COALESCE($4, institution),
           avatar_url = COALESCE($5, avatar_url),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, email, username, full_name, avatar_url, bio, institution, research_interests,
                 verification_status, role, subscription_tier, updated_at`,
      [bio === undefined ? null : bio.trim(), interests, full_name === undefined ? null : full_name.trim(),
       institution === undefined ? null : String(institution).trim(), avatar_url === undefined ? null : avatar_url, user_id]
    );

    return sendSuccess(res, updatedUser.rows[0], 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
};
