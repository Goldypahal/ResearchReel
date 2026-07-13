const express = require('express');
const router = express.Router();
const citationController = require('../controllers/citationController');
const { authMiddleware: protect } = require('../middleware/authMiddleware');

router.get('/graph/:doi', protect, citationController.getGraph);
router.post('/paper', protect, citationController.addPaper);
router.post('/link', protect, citationController.addCitation);

module.exports = router;
