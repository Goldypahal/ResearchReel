const crypto = require('crypto');

/**
 * Uploaded papers live under public/uploads/documents/, but they are not
 * public: the static route only serves them with a short-lived signature, and
 * the API hands out a freshly signed link each time it returns a document the
 * caller is allowed to read. Making a paper private or deleting it therefore
 * cuts off access once any link already handed out expires.
 */
const LINK_TTL_SECONDS = 6 * 60 * 60;
const PROTECTED_PREFIX = 'documents/';

const secret = () => {
  const base = process.env.FILE_URL_SECRET || process.env.JWT_SECRET;
  if (!base) throw new Error('Set FILE_URL_SECRET (or JWT_SECRET) to sign file links.');
  return crypto.createHash('sha256').update(`researchreel-file-links:${base}`).digest();
};

const mac = (key, exp) => crypto.createHmac('sha256', secret()).update(`${key}\n${exp}`).digest('base64url');

const isProtected = (storageKey) => typeof storageKey === 'string' && storageKey.startsWith(PROTECTED_PREFIX);

/** Origin the browser should load uploads from. */
const originFor = (storedUrl) => {
  if (process.env.PUBLIC_API_ORIGIN) return process.env.PUBLIC_API_ORIGIN.replace(/\/$/, '');
  if (typeof storedUrl === 'string' && storedUrl.includes('/uploads/')) return storedUrl.split('/uploads/')[0];
  return '';
};

/** Absolute, signed link for one stored file, valid for LINK_TTL_SECONDS. */
const signedUrl = (storageKey, storedUrl, now = Date.now()) => {
  if (!isProtected(storageKey)) return storedUrl || null;
  // Round expiry to the hour so repeated reads return the same (cacheable) URL.
  const hour = 3600;
  const exp = Math.ceil((Math.floor(now / 1000) + LINK_TTL_SECONDS) / hour) * hour;
  const encoded = storageKey.split('/').map(encodeURIComponent).join('/');
  return `${originFor(storedUrl)}/uploads/${encoded}?exp=${exp}&sig=${mac(storageKey, exp)}`;
};

const verify = (storageKey, exp, sig, now = Date.now()) => {
  const expNum = Number(exp);
  if (!Number.isInteger(expNum) || expNum * 1000 < now || typeof sig !== 'string') return false;
  const expected = Buffer.from(mac(storageKey, expNum));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

/** Express middleware in front of the static uploads route. */
const requireSignedLink = (req, res, next) => {
  let key;
  try {
    key = decodeURIComponent(req.path.replace(/^\//, ''));
  } catch {
    return res.status(404).end();
  }
  if (!isProtected(key)) return next();
  if (!verify(key, req.query.exp, req.query.sig)) {
    return res.status(404).json({ success: false, message: 'This link has expired. Reopen the paper to get a new one.', code: 'NOT_FOUND' });
  }
  res.setHeader('Cache-Control', 'private, max-age=3600');
  return next();
};

module.exports = { signedUrl, verify, requireSignedLink, isProtected, LINK_TTL_SECONDS };
