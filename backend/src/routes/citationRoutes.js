const express = require('express');
const router = express.Router();
const citationController = require('../controllers/citationController');
const { authMiddleware: protect, checkRole } = require('../middleware/authMiddleware');

router.get('/graph/:doi', protect, citationController.getGraph);
// The citation graph is shared by everyone: only admins may write to it by hand.
router.post('/paper', protect, checkRole(['admin']), citationController.addPaper);
router.post('/link', protect, checkRole(['admin']), citationController.addCitation);

module.exports = router;
