const express = require('express');
const router = express.Router();
const c = require('../controllers/projectController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', c.getProjects);
router.post('/', c.createProject);
router.get('/tasks/mine', c.getMyTasks);
router.put('/tasks/:taskId', c.updateTask);
router.delete('/tasks/:taskId', c.deleteTask);
router.get('/:id', c.getProjectById);
router.put('/:id', c.updateProject);
router.delete('/:id', c.deleteProject);
router.get('/:id/members', c.getMembers);
router.post('/:id/members', c.addMember);
router.delete('/:id/members/:userId', c.removeMember);
router.get('/:id/documents', c.getDocuments);
router.post('/:id/documents', c.addDocument);
router.delete('/:id/documents/:documentId', c.removeDocument);
router.get('/:id/tasks', c.getProjectTasks);
router.post('/:id/tasks', c.createTask);

module.exports = router;
