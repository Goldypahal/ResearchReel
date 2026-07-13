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
    // Corrupt the ciphertext part
    const corrupted = parts[0] + ':badcafebadcafe';
    const result = decrypt(corrupted);
    expect(result).toBeNull();
  });
});
