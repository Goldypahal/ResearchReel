const express = require('express');
const lectures = require('../controllers/lectureController');
const conferences = require('../controllers/conferenceController');
const { authMiddleware, optionalAuth } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

const lectureRouter = express.Router();
lectureRouter.get('/', optionalAuth, lectures.list);
lectureRouter.post('/', authMiddleware, rateLimiter(20, 3600), lectures.create);
lectureRouter.get('/:id/calendar.ics', lectures.calendar);
lectureRouter.get('/:id', optionalAuth, lectures.get);
lectureRouter.post('/:id/status', authMiddleware, lectures.setStatus);
lectureRouter.delete('/:id', authMiddleware, lectures.remove);
lectureRouter.post('/:id/attend', authMiddleware, lectures.attend);
lectureRouter.delete('/:id/attend', authMiddleware, lectures.leave);
lectureRouter.post('/:id/comments', authMiddleware, rateLimiter(30, 60), lectures.comment);

const conferenceRouter = express.Router();
conferenceRouter.get('/', optionalAuth, conferences.list);
conferenceRouter.post('/', authMiddleware, rateLimiter(20, 3600), conferences.create);
conferenceRouter.get('/:id', optionalAuth, conferences.get);
conferenceRouter.post('/:id/follow', authMiddleware, conferences.follow);
conferenceRouter.delete('/:id/follow', authMiddleware, conferences.unfollow);
conferenceRouter.delete('/:id', authMiddleware, conferences.remove);

module.exports = { lectureRouter, conferenceRouter };
