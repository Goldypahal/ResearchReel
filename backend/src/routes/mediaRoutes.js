const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { authMiddleware } = require('../middleware/authMiddleware');
const virusScanMiddleware = require('../middleware/virusScan');

// Ensure staging directory exists
const stagingDir = path.join(__dirname, '../../public/uploads/staging');
if (!fs.existsSync(stagingDir)) {
  fs.mkdirSync(stagingDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, stagingDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `staging-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Multer upload setup
const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.mp4' || ext === '.mov') {
      return cb(null, true);
    }
    return cb(new Error('Only MP4 and MOV video formats are supported.'));
  }
});

// Route for video upload
router.post('/upload', authMiddleware, upload.single('video'), virusScanMiddleware, mediaController.uploadVideo);
router.get('/health', mediaController.healthCheck);

module.exports = router;
