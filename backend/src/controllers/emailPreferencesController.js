const prefs = require('../services/emailPreferences');
const { sendSuccess, sendError } = require('../utils/response');

exports.get = async (req, res, next) => {
  try {
    return sendSuccess(res, await prefs.get(req.user.id), 'Email preferences.');
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { categories, timezone } = req.body || {};
    if (timezone !== undefined && timezone !== null && !prefs.isValidTimezone(timezone)) {
      return sendError(res, 'Unknown time zone.', 400, 'VALIDATION_ERROR', req);
    }
    return sendSuccess(res, await prefs.update(req.user.id, { categories, timezone }), 'Email preferences saved.');
  } catch (err) { next(err); }
};

/**
 * One-click unsubscribe (RFC 8058). Mail providers POST here from the
 * List-Unsubscribe header; the /unsubscribe page in the web app does the same.
 * No login needed: the signed token identifies the user and category.
 */
exports.unsubscribe = async (req, res, next) => {
  try {
    const token = req.query.token || req.body?.token;
    const result = await prefs.unsubscribe(token);
    if (!result) return sendError(res, 'This unsubscribe link is invalid.', 400, 'INVALID_TOKEN', req);
    return sendSuccess(res, result, `You won't get emails about ${result.label.toLowerCase()} any more.`);
  } catch (err) { next(err); }
};
