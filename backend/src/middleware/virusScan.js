const fs = require('fs');
const net = require('net');
const logger = require('../utils/logger');

/**
 * Malware scanning for uploads via a ClamAV daemon (clamd) using its INSTREAM
 * protocol, so no extra dependency is needed.
 *
 * - CLAMAV_HOST (and optional CLAMAV_PORT, default 3310) enables scanning.
 * - When it is configured, uploads are rejected if the file is infected and
 *   the request fails closed (503) if the scanner can't be reached.
 * - When it isn't configured, uploads pass through and a warning is logged
 *   once, so a missing scanner is visible in the logs rather than silent.
 */
const HOST = process.env.CLAMAV_HOST;
const PORT = Number(process.env.CLAMAV_PORT || 3310);
const TIMEOUT_MS = Number(process.env.CLAMAV_TIMEOUT_MS || 30000);
const CHUNK = 64 * 1024;

let warnedUnconfigured = false;

/** Streams a file to clamd and resolves with its one-line verdict, e.g. "stream: OK". */
const scanFile = (filePath) =>
  new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: HOST, port: PORT });
    let reply = '';
    let settled = false;
    const done = (err, value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve(value);
    };

    socket.setTimeout(TIMEOUT_MS, () => done(new Error('ClamAV scan timed out')));
    socket.on('error', done);
    socket.on('data', (d) => { reply += d.toString(); });
    socket.on('end', () => done(null, reply.replace(/\0/g, '').trim()));

    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      const stream = fs.createReadStream(filePath, { highWaterMark: CHUNK });
      stream.on('data', (chunk) => {
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length, 0);
        socket.write(size);
        socket.write(chunk);
      });
      stream.on('end', () => socket.write(Buffer.alloc(4))); // zero-length chunk ends the stream
      stream.on('error', done);
    });
  });

const uploadedFiles = (req) => {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') return Object.values(req.files).flat();
  return [];
};

const removeAll = (files) => files.forEach((f) => f.path && fs.promises.unlink(f.path).catch(() => {}));

const virusScanMiddleware = async (req, res, next) => {
  const files = uploadedFiles(req).filter((f) => f.path);
  if (files.length === 0) return next();

  if (!HOST) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      logger.warn('[MALWARE SCAN] CLAMAV_HOST is not set; uploads are not being scanned for malware.');
    }
    return next();
  }

  try {
    for (const file of files) {
      const verdict = await scanFile(file.path);
      if (/FOUND$/.test(verdict)) {
        logger.warn(`[MALWARE SCAN] Rejected ${file.originalname}: ${verdict}`);
        removeAll(files);
        return res.status(422).json({
          success: false,
          message: 'This file was rejected because it appears to contain malware.',
          error: { code: 'MALWARE_DETECTED', message: 'This file was rejected because it appears to contain malware.' },
        });
      }
      if (!/OK$/.test(verdict)) throw new Error(`Unexpected scanner reply: ${verdict}`);
    }
    return next();
  } catch (error) {
    logger.error(`[MALWARE SCAN ERROR] ${error.message}`);
    removeAll(files);
    return res.status(503).json({
      success: false,
      message: 'We could not check this file for malware right now. Please try again shortly.',
      error: { code: 'SCAN_UNAVAILABLE', message: 'We could not check this file for malware right now. Please try again shortly.' },
    });
  }
};

virusScanMiddleware.scanFile = scanFile;
module.exports = virusScanMiddleware;
