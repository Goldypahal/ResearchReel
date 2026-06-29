const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Project Board (Section 4.3.1)
router.get('/', authMiddleware, projectController.getProjects);
router.get('/:project_id/tasks', authMiddleware, projectController.getProjectTasks);
router.put('/task/update', authMiddleware, projectController.updateTask);

// Version Control (Section 4.3.2)
router.get('/document/:document_id/versions', authMiddleware, projectController.getDocumentVersions);
router.post('/document/version/create', authMiddleware, projectController.createVersion);

// Authorship (Section 4.3.3)
router.get('/document/:document_id/authorship', authMiddleware, projectController.getAuthorshipMetrics);

module.exports = router;
