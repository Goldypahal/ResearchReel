const db = require('../config/db');
const redisClient = require('../config/redisClient');
const aiService = require('../services/aiService');
const { canAccessDocument } = require('../authorization/documentAuthorization');
const { sendSuccess, sendError } = require('../utils/response');
const { isUuid } = require('../utils/pagination');

const DAILY_AI_CAP = Number(process.env.AI_DAILY_LIMIT || 100);

const consumeDailyQuota = async (userId) => {
  const key = `ai_cap:${userId}:${new Date().toISOString().slice(0, 10)}`;
  const count = await redisClient.incr(key);
  if (count === 1) await redisClient.expire(key, 86400);
  return count === null || count <= DAILY_AI_CAP;
};

const ensureAi = (req, res) => {
  if (!aiService.isConfigured()) {
    sendError(res, 'AI features are not enabled on this server yet.', 503, 'AI_UNAVAILABLE', req);
    return false;
  }
  return true;
};

exports.status = (req, res) => sendSuccess(res, { configured: aiService.isConfigured(), daily_limit: DAILY_AI_CAP }, 'AI status.');

exports.summarizeDocument = async (req, res, next) => {
  try {
    const { document_id: documentId, force } = req.body;
    if (!isUuid(documentId)) return sendError(res, 'document_id is required.', 400, 'VALIDATION_ERROR', req);

    const { allowed } = await canAccessDocument(req.user.id, documentId);
    if (!allowed) return sendError(res, 'You do not have access to this document.', 403, 'AUTHORIZATION_ERROR', req);

    if (!force) {
      const existing = await db.query('SELECT summary_text, key_points FROM documents WHERE id = $1', [documentId]);
      const row = existing.rows[0];
      if (row?.summary_text && row.key_points?.length) {
        return sendSuccess(res, { abstract: row.summary_text, key_points: row.key_points }, 'Summary retrieved.');
      }
    }

    if (!ensureAi(req, res)) return;
    if (!(await consumeDailyQuota(req.user.id))) {
      return sendError(res, `You have reached today's limit of ${DAILY_AI_CAP} AI requests.`, 429, 'RATE_LIMIT_EXCEEDED', req);
    }
    const summary = await aiService.summarizeDocument(documentId);
    return sendSuccess(res, summary, 'Summary generated.');
  } catch (error) {
    next(error);
  }
};

exports.ask = async (req, res, next) => {
  try {
    const question = String(req.body.question || '').trim();
    let documentId = req.body.document_id || req.body.documentId || null;
    const conversationId = req.body.conversation_id || null;
    if (documentId === 'global') documentId = null;

    if (!question) return sendError(res, 'Please enter a question.', 400, 'VALIDATION_ERROR', req);
    if (question.length > 4000) return sendError(res, 'Question is too long (max 4000 characters).', 400, 'VALIDATION_ERROR', req);
    if (documentId && !isUuid(documentId)) return sendError(res, 'Invalid document.', 400, 'VALIDATION_ERROR', req);
    if (conversationId && !isUuid(conversationId)) return sendError(res, 'Invalid conversation.', 400, 'VALIDATION_ERROR', req);

    if (documentId) {
      const { allowed } = await canAccessDocument(req.user.id, documentId);
      if (!allowed) return sendError(res, 'You do not have access to this document.', 403, 'AUTHORIZATION_ERROR', req);
    }

    if (!ensureAi(req, res)) return;
    if (!(await consumeDailyQuota(req.user.id))) {
      return sendError(res, `You have reached today's limit of ${DAILY_AI_CAP} AI requests.`, 429, 'RATE_LIMIT_EXCEEDED', req);
    }

    const result = await aiService.ask({ userId: req.user.id, question, documentId, conversationId });
    return sendSuccess(res, result, 'Answer generated.');
  } catch (error) {
    next(error);
  }
};

exports.listConversations = async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT c.id, c.title, c.document_id, c.created_at, c.updated_at, COALESCE(d.title, d.file_name) AS document_title
         FROM ai_conversations c LEFT JOIN documents d ON d.id = c.document_id
        WHERE c.user_id = $1 ORDER BY c.updated_at DESC LIMIT 50`,
      [req.user.id]
    );
    return sendSuccess(res, r.rows, 'Conversations.');
  } catch (error) {
    next(error);
  }
};

exports.getConversation = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Conversation not found.', 404, 'NOT_FOUND', req);
    const c = await db.query(
      `SELECT c.*, COALESCE(d.title, d.file_name) AS document_title
         FROM ai_conversations c LEFT JOIN documents d ON d.id = c.document_id
        WHERE c.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!c.rows[0]) return sendError(res, 'Conversation not found.', 404, 'NOT_FOUND', req);
    const m = await db.query('SELECT id, role, content, sources, created_at FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at ASC', [req.params.id]);
    return sendSuccess(res, { ...c.rows[0], messages: m.rows }, 'Conversation.');
  } catch (error) {
    next(error);
  }
};

exports.deleteConversation = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Conversation not found.', 404, 'NOT_FOUND', req);
    const r = await db.query('DELETE FROM ai_conversations WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (!r.rows.length) return sendError(res, 'Conversation not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, { id: req.params.id }, 'Conversation deleted.');
  } catch (error) {
    next(error);
  }
};

exports.getRecommendations = async (req, res, next) => {
  try {
    const recs = await aiService.getRecommendations({
      userId: req.user?.id,
      query: req.query.q ? String(req.query.q).slice(0, 200) : null,
      limit: Math.min(parseInt(req.query.limit, 10) || 10, 30)
    });
    return sendSuccess(res, recs, 'Recommended papers.');
  } catch (error) {
    next(error);
  }
};
