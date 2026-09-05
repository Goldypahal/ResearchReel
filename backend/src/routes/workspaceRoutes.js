const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/', authMiddleware, workspaceController.createWorkspace);
router.get('/', authMiddleware, workspaceController.getWorkspaces);

module.exports = router;

