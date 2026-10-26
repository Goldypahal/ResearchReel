const { encrypt, decrypt } = require('../src/utils/cryptoHelper');

describe('Crypto Helper Tests', () => {
  const testKey = 'AIzaSyTestKey1234567890Value';

  test('should encrypt and decrypt correctly', () => {
    const encrypted = encrypt(testKey);
    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe('string');
    expect(encrypted.includes(':')).toBe(true);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(testKey);
  });

  test('should return null for empty or falsy inputs', () => {
    expect(encrypt(null)).toBeNull();
    expect(encrypt('')).toBeNull();
    expect(decrypt(null)).toBeNull();
    expect(decrypt('')).toBeNull();
  });

  test('should handle decryption errors gracefully', () => {
    const badInput = 'some-invalid-format-string';
    const result = decrypt(badInput);
    expect(result).toBeNull();
  });

  test('should handle decryption of corrupted payload gracefully', () => {
    const encrypted = encrypt(testKey);
    const parts = encrypted.split(':');
    // Flip the ciphertext: GCM's auth tag must reject it
    parts[3] = parts[3].replace(/^./, (c) => (c === 'a' ? 'b' : 'a'));
    expect(decrypt(parts.join(':'))).toBeNull();
  });

  test('uses authenticated v2 format with a fresh IV each time', () => {
    const a = encrypt(testKey);
    const b = encrypt(testKey);
    expect(a.startsWith('v2:')).toBe(true);
    expect(a).not.toBe(b);
  });

  test('still reads values stored in the legacy CBC format', () => {
    const crypto = require('crypto');
    const key = crypto.createHash('sha256').update(process.env.JWT_SECRET).digest();
    const iv = crypto.randomBytes(16);
    const c = crypto.createCipheriv('aes-256-cbc', key, iv);
    const legacy = iv.toString('hex') + ':' + c.update(testKey, 'utf8', 'hex') + c.final('hex');
    expect(decrypt(legacy)).toBe(testKey);
  });
});
