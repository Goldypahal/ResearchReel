const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const collab = require('../controllers/projectCollabController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Projects APIs (Section 21)
router.get('/', authMiddleware, projectController.getProjects);
router.post('/', authMiddleware, projectController.createProject);
router.get('/:id', authMiddleware, collab.getProjectDetail);
router.patch('/:id', authMiddleware, collab.updateProject);
router.delete('/:id', authMiddleware, projectController.deleteProject);

// Members & papers
router.post('/:id/members', authMiddleware, collab.addMember);
router.patch('/:id/members/:userId', authMiddleware, collab.updateMember);
router.delete('/:id/members/:userId', authMiddleware, collab.removeMember);
router.post('/:id/papers', authMiddleware, collab.addPaper);
router.delete('/:id/papers/:documentId', authMiddleware, collab.removePaper);

// Tasks APIs (Section 21 / 25)
router.get('/:id/tasks', authMiddleware, projectController.getProjectTasks);
router.post('/:id/tasks', authMiddleware, projectController.createTask);
router.put('/tasks/:taskId', authMiddleware, projectController.updateTask);
router.delete('/tasks/:taskId', authMiddleware, projectController.deleteTask);

// Version Control (Section 15)
router.get('/document/:document_id/versions', authMiddleware, projectController.getDocumentVersions);
router.post('/document/version/create', authMiddleware, projectController.createVersion);

module.exports = router;
