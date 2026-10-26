const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const assetController = require('../controllers/assetController');
const virusScan = require('../middleware/virusScan');
const { authMiddleware } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

const upload = multer({
  dest: path.join(os.tmpdir(), 'researchreel-uploads'),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (assetController.ALLOWED[ext]) return cb(null, true);
    const err = new Error('Only PDF and DOCX files are supported.');
    err.statusCode = 400;
    err.code = 'UNSUPPORTED_FILE';
    return cb(err);
  }
});
fs.mkdirSync(path.join(os.tmpdir(), 'researchreel-uploads'), { recursive: true });

// Turn multer limit errors into clean 4xx responses
const handleUpload = (req, res, next) => upload.single('file')(req, res, (err) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    err.statusCode = 413;
    err.message = 'Files are limited to 50 MB.';
  }
  err.statusCode = err.statusCode || 400;
  next(err);
});

router.use(authMiddleware);

router.post('/upload', rateLimiter.action('upload-paper', { ip: 40, user: 20, window: 3600 }), handleUpload, virusScan, assetController.uploadDocument);
router.get('/', assetController.getUserAssets);
router.get('/:id', assetController.getAsset);
router.patch('/:id', assetController.updateAsset);
router.delete('/:id', assetController.softDeleteAsset);

module.exports = router;
