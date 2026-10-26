const express = require('express');
const router = express.Router();
const lectures = require('../controllers/lectureController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = (res) => res.status(404).json({ success: false, message: 'Lecture not found.', error: { code: 'NOT_FOUND', message: 'Lecture not found.' } });
router.param('id', (req, res, next, id) => (UUID_RE.test(id) ? next() : notFound(res)));
router.param('questionId', (req, res, next, id) => (UUID_RE.test(id) ? next() : notFound(res)));

// Browsing is public so lectures can be shared; actions need an account.
router.get('/', optionalAuth, lectures.list);
router.get('/topics', lectures.topics);
router.get('/can-host', authMiddleware, lectures.canHost);
router.post('/', authMiddleware, rateLimiter.action('create-lecture', { ip: 20, user: 10, window: 86400 }), lectures.create);
router.get('/:id', optionalAuth, lectures.get);
router.patch('/:id', authMiddleware, lectures.update);
router.post('/:id/cancel', authMiddleware, lectures.cancel);
router.post('/:id/register', authMiddleware, lectures.register);
router.delete('/:id/register', authMiddleware, lectures.unregister);
router.get('/:id/attendees', authMiddleware, lectures.attendees);
router.get('/:id/questions', optionalAuth, lectures.listQuestions);
router.post('/:id/questions', authMiddleware, rateLimiter.action('lecture-question', { ip: 60, user: 20, window: 600 }), lectures.ask);
router.patch('/:id/questions/:questionId', authMiddleware, lectures.moderateQuestion);
router.delete('/:id/questions/:questionId', authMiddleware, lectures.deleteQuestion);

module.exports = router;
