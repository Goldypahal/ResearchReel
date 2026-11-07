const crypto = require('crypto');
const db = require('../config/db');

/**
 * Email notification categories. `types` are the in-app notification types
 * that produce an email in that category.
 */
const CATEGORIES = [
  { key: 'comments', label: 'Comments, replies and mentions', defaultOn: true, types: ['comment', 'reply', 'mention'] },
  { key: 'follows', label: 'New followers', defaultOn: true, types: ['follow'] },
  { key: 'projects', label: 'Project invitations', defaultOn: true, types: ['project_invite'] },
  { key: 'lecture_reminders', label: 'Reminders and changes for lectures you registered for', defaultOn: true, types: ['lecture_reminder', 'lecture_cancelled'] },
  { key: 'lecture_activity', label: 'Questions and registrations on lectures you host', defaultOn: true, types: ['lecture_question', 'lecture_registration'] },
  { key: 'reactions', label: 'Reactions to your posts', defaultOn: false, types: ['reaction'] },
];

const BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));
const CATEGORY_FOR_TYPE = Object.fromEntries(CATEGORIES.flatMap((c) => c.types.map((t) => [t, c.key])));

/** Stored preferences only hold overrides; anything missing falls back to the category default. */
const resolve = (stored = {}) =>
  Object.fromEntries(CATEGORIES.map((c) => [c.key, typeof stored[c.key] === 'boolean' ? stored[c.key] : c.defaultOn]));

const isValidTimezone = (tz) => {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const get = async (userId) => {
  const res = await db.query('SELECT email_preferences, timezone FROM users WHERE id = $1', [userId]);
  const row = res.rows[0] || {};
  return {
    categories: CATEGORIES.map((c) => ({ key: c.key, label: c.label, enabled: resolve(row.email_preferences)[c.key] })),
    timezone: row.timezone || null,
  };
};

const update = async (userId, { categories, timezone } = {}) => {
  const patch = {};
  if (categories && typeof categories === 'object') {
    for (const [key, value] of Object.entries(categories)) {
      if (BY_KEY[key] && typeof value === 'boolean') patch[key] = value;
    }
  }
  const tz = timezone === undefined ? undefined : isValidTimezone(timezone) ? timezone : null;
  await db.query(
    `UPDATE users SET email_preferences = email_preferences || $2::jsonb,
            timezone = CASE WHEN $3::boolean THEN $4 ELSE timezone END,
            updated_at = NOW()
     WHERE id = $1`,
    [userId, JSON.stringify(patch), tz !== undefined, tz ?? null]
  );
  return get(userId);
};

/** True when this user wants email for this notification type. */
const wants = (storedPrefs, type) => {
  const category = CATEGORY_FOR_TYPE[type];
  return Boolean(category) && resolve(storedPrefs)[category];
};

// ---- One-click unsubscribe tokens -------------------------------------------
// Signed, not stored: `<userId>.<category>.<hmac>`. They don't expire, which is
// what mail providers expect of List-Unsubscribe links.

const secret = () => {
  const s = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!s) throw new Error('ENCRYPTION_KEY or JWT_SECRET must be set to sign unsubscribe links.');
  return crypto.createHash('sha256').update(`unsubscribe:${s}`).digest();
};
const sign = (payload) => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

const unsubscribeToken = (userId, category) => `${userId}.${category}.${sign(`${userId}.${category}`)}`;

const readUnsubscribeToken = (token) => {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [userId, category, mac] = parts;
  if (!BY_KEY[category]) return null;
  const expected = Buffer.from(sign(`${userId}.${category}`));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return { userId, category };
};

const unsubscribe = async (token) => {
  const parsed = readUnsubscribeToken(token);
  if (!parsed) return null;
  await db.query(
    `UPDATE users SET email_preferences = email_preferences || jsonb_build_object($2::text, false), updated_at = NOW() WHERE id = $1`,
    [parsed.userId, parsed.category]
  );
  return { category: parsed.category, label: BY_KEY[parsed.category].label };
};

module.exports = {
  CATEGORIES, CATEGORY_FOR_TYPE, resolve, get, update, wants, isValidTimezone,
  unsubscribeToken, readUnsubscribeToken, unsubscribe,
};
