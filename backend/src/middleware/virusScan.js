const fs = require('fs');
const net = require('net');

/**
 * Malware scanning for uploads through a ClamAV daemon (clamd), using its INSTREAM
 * protocol directly so no extra dependency is needed.
 *
 * - CLAMAV_HOST (and optional CLAMAV_PORT, default 3310) turns scanning on.
 * - When configured, infected files are rejected (422) and uploads fail closed (503)
 *   if the scanner cannot be reached.
 * - When not configured, uploads pass and a warning is logged once.
 */
const CHUNK = 64 * 1024;
let warnedUnconfigured = false;

const config = () => ({
  host: process.env.CLAMAV_HOST,
  port: Number(process.env.CLAMAV_PORT || 3310),
  timeoutMs: Number(process.env.CLAMAV_TIMEOUT_MS || 60000)
});

/** Streams a Buffer or a file path to clamd; resolves with the verdict, e.g. "stream: OK". */
const scan = (source) => new Promise((resolve, reject) => {
  const { host, port, timeoutMs } = config();
  const socket = net.createConnection({ host, port });
  let reply = '';
  let settled = false;
  const done = (err, value) => {
    if (settled) return;
    settled = true;
    socket.destroy();
    if (err) reject(err); else resolve(value);
  };
  const sendChunk = (chunk) => {
    const size = Buffer.alloc(4);
    size.writeUInt32BE(chunk.length, 0);
    socket.write(size);
    socket.write(chunk);
  };

  socket.setTimeout(timeoutMs, () => done(new Error('ClamAV scan timed out')));
  socket.on('error', done);
  socket.on('data', (d) => { reply += d.toString(); });
  socket.on('end', () => done(null, reply.replace(/\0/g, '').trim()));
  socket.on('connect', () => {
    socket.write('zINSTREAM\0');
    if (Buffer.isBuffer(source)) {
      for (let i = 0; i < source.length; i += CHUNK) sendChunk(source.subarray(i, i + CHUNK));
      socket.write(Buffer.alloc(4)); // a zero-length chunk ends the stream
      return;
    }
    const stream = fs.createReadStream(source, { highWaterMark: CHUNK });
    stream.on('data', sendChunk);
    stream.on('end', () => socket.write(Buffer.alloc(4)));
    stream.on('error', done);
  });
});

const uploadedFiles = (req) => {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') return Object.values(req.files).flat();
  return [];
};

const discard = (files) => files.forEach((f) => f.path && fs.promises.unlink(f.path).catch(() => {}));

const fail = (res, status, code, message) => res.status(status).json({ success: false, message, error: { code, message } });

/** Express middleware; place it after multer (and after signature checks). */
const scanUploads = async (req, res, next) => {
  const files = uploadedFiles(req).filter((f) => f.buffer || f.path);
  if (!files.length) return next();

  if (!config().host) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn('[malware-scan] CLAMAV_HOST is not set; uploads are not scanned for malware.');
    }
    return next();
  }

  try {
    for (const file of files) {
      const verdict = await scan(file.buffer || file.path);
      if (/FOUND$/.test(verdict)) {
        console.warn(`[malware-scan] rejected "${file.originalname}": ${verdict}`);
        discard(files);
        return fail(res, 422, 'MALWARE_DETECTED', 'This file was rejected because it appears to contain malware.');
      }
      if (!/OK$/.test(verdict)) throw new Error(`Unexpected scanner reply: ${verdict}`);
    }
    return next();
  } catch (error) {
    console.error(`[malware-scan] ${error.message}`);
    discard(files);
    return fail(res, 503, 'SCAN_UNAVAILABLE', 'We could not check this file for malware right now. Please try again shortly.');
  }
};

/** Health check: null when not configured, otherwise whether clamd answers PING. */
const ping = () => new Promise((resolve) => {
  const { host, port } = config();
  if (!host) return resolve(null);
  const socket = net.createConnection({ host, port });
  let reply = '';
  const finish = (ok) => { socket.destroy(); resolve(ok); };
  socket.setTimeout(3000, () => finish(false));
  socket.on('error', () => finish(false));
  socket.on('connect', () => socket.write('zPING\0'));
  socket.on('data', (d) => { reply += d.toString(); if (reply.includes('PONG')) finish(true); });
  socket.on('end', () => finish(reply.includes('PONG')));
});

module.exports = { scanUploads, scan, ping };
