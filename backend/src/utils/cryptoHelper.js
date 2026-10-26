const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Encryption for secrets we must store (users' own Gemini API keys).
 *
 * New values: AES-256-GCM (authenticated), format `v2:<iv>:<tag>:<ciphertext>` (hex),
 * keyed by ENCRYPTION_KEY — 32 bytes as 64 hex chars, base64, or a 32-character string. It is separate
 * from JWT_SECRET so rotating session signing doesn't destroy stored secrets.
 *
 * Legacy values (`<iv>:<ciphertext>`, AES-256-CBC keyed by sha256(JWT_SECRET))
 * are still readable so existing users keep their keys; they are re-encrypted
 * as v2 on next save.
 */
const parseKey = (raw) => {
  if (!raw) return null;
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  if (Buffer.byteLength(raw, 'utf8') === 32) return Buffer.from(raw, 'utf8');
  const b64 = Buffer.from(raw, 'base64');
  return b64.length === 32 ? b64 : null;
};

let cachedKey;
const getKey = () => {
  if (cachedKey) return cachedKey;
  const key = parseKey(process.env.ENCRYPTION_KEY);
  if (key) return (cachedKey = key);
  if (process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters, base64, or 32 characters).');
  if (process.env.NODE_ENV === 'production') throw new Error('ENCRYPTION_KEY is required in production.');
  if (!process.env.JWT_SECRET) throw new Error('Set ENCRYPTION_KEY (or JWT_SECRET in development).');
  // Development convenience only: derive a key, never fall back to a constant.
  cachedKey = crypto.createHash('sha256').update(`researchreel-dev-encryption:${process.env.JWT_SECRET}`).digest();
  return cachedKey;
};

const legacyKey = () => (process.env.JWT_SECRET ? crypto.createHash('sha256').update(process.env.JWT_SECRET).digest() : null);

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return ['v2', iv.toString('hex'), cipher.getAuthTag().toString('hex'), ciphertext.toString('hex')].join(':');
}

function decrypt(payload) {
  if (!payload) return null;
  try {
    const parts = String(payload).split(':');
    if (parts[0] === 'v2' && parts.length === 4) {
      const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(parts[1], 'hex'));
      decipher.setAuthTag(Buffer.from(parts[2], 'hex'));
      return Buffer.concat([decipher.update(Buffer.from(parts[3], 'hex')), decipher.final()]).toString('utf8');
    }
    if (parts.length === 2 && legacyKey()) {
      const decipher = crypto.createDecipheriv('aes-256-cbc', legacyKey(), Buffer.from(parts[0], 'hex'));
      return Buffer.concat([decipher.update(Buffer.from(parts[1], 'hex')), decipher.final()]).toString('utf8');
    }
    return null;
  } catch (error) {
    console.error('[Crypto Helper] Decryption failed:', error.message);
    return null;
  }
}

module.exports = { encrypt, decrypt };
