const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All asset routes require authentication
router.use(authMiddleware);

router.post('/upload-url', assetController.generateUploadUrl);
router.post('/register', assetController.registerAsset);
router.get('/', assetController.getUserAssets);
router.delete('/:id', assetController.softDeleteAsset);

module.exports = router;
