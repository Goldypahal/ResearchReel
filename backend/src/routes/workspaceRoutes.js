const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
// const { verifyToken } = require('../middleware/authMiddleware'); // Uncomment when fully integrated

router.post('/', workspaceController.createWorkspace);
router.get('/', workspaceController.getWorkspaces);

module.exports = router;
