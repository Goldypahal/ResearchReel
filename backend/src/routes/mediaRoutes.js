const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { authMiddleware, uploadAuth } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const { UPLOAD_DIR } = require('../services/storageService');

// Staging lives on the same disk the worker reads from (the API process runs the worker by default).
const stagingDir = path.join(UPLOAD_DIR, '.staging');
fs.mkdirSync(stagingDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, stagingDir),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '')}`)
  }),
  limits: { fileSize: Number(process.env.MAX_VIDEO_MB || 200) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['video/mp4', 'video/quicktime', 'video/webm'].includes(file.mimetype)
      && ['.mp4', '.mov', '.webm', '.m4v'].includes(path.extname(file.originalname).toLowerCase());
    if (ok) return cb(null, true);
    const err = new Error('Only MP4, MOV and WebM videos are supported.');
    err.statusCode = 400; err.code = 'VALIDATION_ERROR';
    return cb(err);
  }
});

router.post('/upload', uploadAuth, rateLimiter(20, 3600), upload.single('video'), mediaController.uploadVideo);

module.exports = router;
