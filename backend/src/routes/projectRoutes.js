const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Projects APIs (Section 21)
router.get('/', authMiddleware, projectController.getProjects);
router.post('/', authMiddleware, projectController.createProject);
router.get('/:id', authMiddleware, projectController.getProjectById);
router.delete('/:id', authMiddleware, projectController.deleteProject);

// Tasks APIs (Section 21 / 25)
router.get('/:id/tasks', authMiddleware, projectController.getProjectTasks);
router.post('/:id/tasks', authMiddleware, projectController.createTask);
router.put('/tasks/:taskId', authMiddleware, projectController.updateTask);

// Legacy task path support
router.get('/:project_id/tasks', authMiddleware, projectController.getProjectTasks);
router.put('/task/update', authMiddleware, projectController.updateTask);

// Version Control (Section 15)
router.get('/document/:document_id/versions', authMiddleware, projectController.getDocumentVersions);
router.post('/document/version/create', authMiddleware, projectController.createVersion);

module.exports = router;
