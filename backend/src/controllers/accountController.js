const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');
const authService = require('../services/authService');
const { uploadsRoot } = require('../services/documentProcessor');
const { sendSuccess, sendError } = require('../utils/response');
const { sniffImage, readHead } = require('../utils/imageType');

const fail = (res, req, err, next) =>
  err && err.name === 'AuthError' ? sendError(res, err.message, err.statusCode || 400, 'ACCOUNT_ERROR', req) : next(err);

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};

exports.listSessions = async (req, res, next) => {
  try {
    return sendSuccess(res, await authService.listSessions(req.user.id, req.user.sid), 'Active sessions.');
  } catch (err) { return fail(res, req, err, next); }
};

exports.revokeSession = async (req, res, next) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return sendError(res, 'Session not found.', 404, 'NOT_FOUND', req);
    await authService.revokeSessionById(req.user.id, req.params.id);
    return sendSuccess(res, {}, 'Signed out of that device.');
  } catch (err) { return fail(res, req, err, next); }
};

exports.revokeOtherSessions = async (req, res, next) => {
  try {
    const count = await authService.revokeOtherSessions(req.user.id, req.user.sid);
    return sendSuccess(res, { revoked: count }, `Signed out of ${count} other ${count === 1 ? 'device' : 'devices'}.`);
  } catch (err) { return fail(res, req, err, next); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body || {};
    const revoked = await authService.changePassword(req.user.id, current_password, new_password, req.user.sid);
    return sendSuccess(res, { revoked }, 'Password updated. Other devices were signed out.');
  } catch (err) { return fail(res, req, err, next); }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    if ((req.body || {}).confirm !== 'DELETE') {
      return sendError(res, 'Type DELETE to confirm.', 400, 'VALIDATION_ERROR', req);
    }
    await authService.deleteAccount(req.user.id, req.body.password);
    clearAuthCookies(res);
    return sendSuccess(res, {}, 'Your account has been deleted.');
  } catch (err) { return fail(res, req, err, next); }
};

exports.uploadAvatar = async (req, res, next) => {
  const tmp = req.file && req.file.path;
  try {
    if (!req.file) return sendError(res, 'Attach an image in the "avatar" field.', 400, 'VALIDATION_ERROR', req);
    const ext = sniffImage(readHead(fs, tmp));
    if (!ext || ext === '.gif') return sendError(res, 'Use a JPG, PNG or WebP image.', 400, 'UNSUPPORTED_FILE', req);

    const dir = path.join(uploadsRoot, 'avatars', req.user.id);
    fs.mkdirSync(dir, { recursive: true });
    const name = `${crypto.randomUUID()}${ext}`;
    fs.renameSync(tmp, path.join(dir, name));

    // Remove the previous avatar file we stored, if any.
    const prev = await db.query('SELECT avatar_url FROM users WHERE id = $1', [req.user.id]);
    const origin = (process.env.PUBLIC_API_ORIGIN || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const url = `${origin}/uploads/avatars/${req.user.id}/${name}`;
    await db.query('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [url, req.user.id]);
    const old = prev.rows[0]?.avatar_url;
    const marker = `/uploads/avatars/${req.user.id}/`;
    if (old && old.includes(marker)) {
      const oldName = path.basename(old.split(marker)[1] || '');
      if (oldName && oldName !== name) fs.unlink(path.join(dir, oldName), () => {});
    }
    return sendSuccess(res, { avatar_url: url }, 'Profile photo updated.');
  } catch (err) {
    next(err);
  } finally {
    if (tmp && fs.existsSync(tmp)) fs.unlink(tmp, () => {});
  }
};

exports.removeAvatar = async (req, res, next) => {
  try {
    await db.query('UPDATE users SET avatar_url = NULL, updated_at = NOW() WHERE id = $1', [req.user.id]);
    return sendSuccess(res, { avatar_url: null }, 'Profile photo removed.');
  } catch (err) { next(err); }
};
