const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

/**
 * File storage abstraction.
 *
 * - Default: local disk under UPLOAD_DIR (served by Express at /uploads). On a PaaS,
 *   mount a persistent disk at that path.
 * - If S3_BUCKET is set: any S3-compatible store (AWS S3, Cloudflare R2, Backblaze B2,
 *   DigitalOcean Spaces). Set S3_PUBLIC_URL to the public base URL of the bucket.
 */
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../public/uploads'));
const useS3 = () => Boolean(process.env.S3_BUCKET);

let s3 = null;
const getS3 = () => {
  if (!s3) {
    const { S3Client } = require('@aws-sdk/client-s3');
    s3 = new S3Client({
      region: process.env.S3_REGION || process.env.AWS_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID ? {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
      } : undefined
    });
  }
  return s3;
};

const SAFE_EXT = /^[a-z0-9]{1,8}$/;
const extOf = (name, mimeType) => {
  const fromName = path.extname(name || '').slice(1).toLowerCase();
  if (SAFE_EXT.test(fromName)) return fromName;
  const map = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4' };
  return map[mimeType] || 'bin';
};

const buildKey = (folder, originalName, mimeType) =>
  `${folder.replace(/[^a-z0-9/_-]/gi, '')}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${extOf(originalName, mimeType)}`;

const publicUrlFor = (key) => {
  if (useS3()) {
    const base = (process.env.S3_PUBLIC_URL || '').replace(/\/$/, '');
    return base ? `${base}/${key}` : `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
  }
  return `/uploads/${key}`;
};

/**
 * Stores a file. Provide either `buffer` or `filePath`.
 * @returns {Promise<{ key: string, url: string, size: number }>}
 */
const saveFile = async ({ buffer, filePath, originalName, mimeType, folder = 'misc' }) => {
  const key = buildKey(folder, originalName, mimeType);
  const body = buffer || (await fsp.readFile(filePath));

  if (useS3()) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await getS3().send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: mimeType || 'application/octet-stream'
    }));
  } else {
    const dest = path.join(UPLOAD_DIR, key);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.writeFile(dest, body);
  }

  return { key, url: publicUrlFor(key), size: body.length };
};

const readFile = async (key) => {
  if (useS3()) {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const out = await getS3().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    return Buffer.from(await out.Body.transformToByteArray());
  }
  const resolved = path.resolve(UPLOAD_DIR, key);
  if (!resolved.startsWith(UPLOAD_DIR + path.sep)) throw new Error('Invalid storage key');
  return fsp.readFile(resolved);
};

const deleteFile = async (key) => {
  if (!key) return;
  try {
    if (useS3()) {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await getS3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    } else {
      const resolved = path.resolve(UPLOAD_DIR, key);
      if (resolved.startsWith(UPLOAD_DIR + path.sep) && fs.existsSync(resolved)) await fsp.unlink(resolved);
    }
  } catch (err) {
    console.warn(`[storage] Failed to delete ${key}: ${err.message}`);
  }
};

const ensureUploadDir = () => fs.mkdirSync(UPLOAD_DIR, { recursive: true });

module.exports = { UPLOAD_DIR, saveFile, readFile, deleteFile, publicUrlFor, ensureUploadDir, useS3 };
