const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-32-chars-long-at-least!';

// Derive a 32-byte key from JWT_SECRET
const ENCRYPTION_KEY = crypto.createHash('sha256').update(JWT_SECRET).digest();
const IV_LENGTH = 16;

/**
 * Encrypt a text string using AES-256-CBC
 * @param {string} text
 * @returns {string} iv:encryptedText hex string
 */
function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt an iv:encryptedText hex string
 * @param {string} text
 * @returns {string} decrypted text
 */
function decrypt(text) {
  if (!text) return null;
  try {
    const textParts = text.split(':');
    if (textParts.length < 2) return null;
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Crypto Helper] Decryption failed:', error.message);
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt
};
