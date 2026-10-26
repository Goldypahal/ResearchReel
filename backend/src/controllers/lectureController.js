const lectureService = require('../services/lectureService');
const { sendSuccess } = require('../utils/response');

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    next(err);
  }
};

exports.list = wrap(async (req, res) => {
  const { when, topic, q, cursor, limit } = req.query;
  const result = await lectureService.list({ viewerId: req.user?.id, when, topic, q, cursor, limit });
  return res.status(200).json({ success: true, data: result.items, nextCursor: result.nextCursor });
});

exports.topics = wrap(async (req, res) => sendSuccess(res, await lectureService.topics(), 'Topics fetched.'));

exports.canHost = wrap(async (req, res) => {
  const user = await lectureService.freshUser(req.user);
  return sendSuccess(res, { can_host: lectureService.canHost(user) }, 'Hosting eligibility.');
});

exports.get = wrap(async (req, res) => sendSuccess(res, await lectureService.get(req.params.id, req.user?.id), 'Lecture fetched.'));

exports.create = wrap(async (req, res) => sendSuccess(res, await lectureService.create(req.user, req.body || {}), 'Lecture scheduled.', 201));

exports.update = wrap(async (req, res) => sendSuccess(res, await lectureService.update(req.user, req.params.id, req.body || {}), 'Lecture updated.'));

exports.cancel = wrap(async (req, res) => sendSuccess(res, await lectureService.cancel(req.user, req.params.id), 'Lecture cancelled.'));

exports.register = wrap(async (req, res) => sendSuccess(res, await lectureService.register(req.user.id, req.params.id), "You're registered."));

exports.unregister = wrap(async (req, res) => sendSuccess(res, await lectureService.unregister(req.user.id, req.params.id), 'Registration cancelled.'));

exports.attendees = wrap(async (req, res) => sendSuccess(res, await lectureService.attendees(req.user, req.params.id), 'Attendees fetched.'));

exports.listQuestions = wrap(async (req, res) => sendSuccess(res, await lectureService.listQuestions(req.params.id, req.user), 'Questions fetched.'));

exports.ask = wrap(async (req, res) => sendSuccess(res, await lectureService.ask(req.user, req.params.id, req.body?.body), 'Question posted.', 201));

exports.moderateQuestion = wrap(async (req, res) => {
  await lectureService.moderateQuestion(req.user, req.params.id, req.params.questionId, req.body || {});
  return sendSuccess(res, {}, 'Question updated.');
});

exports.deleteQuestion = wrap(async (req, res) => {
  await lectureService.deleteQuestion(req.user, req.params.id, req.params.questionId);
  return sendSuccess(res, {}, 'Question deleted.');
});
