const aiService = require('../services/aiService');
const db = require('../config/db');
const redisClient = require('../config/redisClient');
const crypto = require('crypto');
const { canAccessDocument, accessibleIndexedDocumentIds } = require('../authorization/documentAuthorization');
const { sendSuccess, sendError } = require('../utils/response');
const documentRepository = require('../repositories/documentRepository');
const gemini = require('../services/ai/geminiClient');

const DAILY_AI_CAP = 50;

const checkDailyAiCap = async (userId) => {
  const today = new Date().toISOString().split('T')[0];
  const redisKey = `ai_cap:${userId}:${today}`;
  
  try {
    const currentCount = await redisClient.get(redisKey);
    if (currentCount && parseInt(currentCount) >= DAILY_AI_CAP) {
      return false;
    }
    if (!currentCount) {
      await redisClient.set(redisKey, '1', { EX: 86400 });
    } else {
      await redisClient.incr(redisKey);
    }
    return true;
  } catch (err) {
    console.error('Failed checking AI daily cap in Redis:', err.message);
    return true;
  }
};

// Document Summarization (Section 16 / 17)
exports.summarizeDocument = async (req, res, next) => {
  const { document_id } = req.body;
  const userId = req.user.id;

  try {
    if (!document_id) {
      return sendError(res, 'document_id is required.', 400, 'VALIDATION_ERROR', req);
    }

    // Document Authorization Check (Section 16)
    const { allowed } = await canAccessDocument(userId, document_id);
    if (!allowed) {
      return sendError(res, 'Forbidden: You do not have access to this document.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const withinLimit = await checkDailyAiCap(userId);
    if (!withinLimit) {
      return sendError(res, `Daily limit of ${DAILY_AI_CAP} AI queries reached.`, 429, 'RATE_LIMIT_EXCEEDED', req);
    }

    const cacheKey = `doc_summary:${document_id}`;
    const cachedSummary = await redisClient.get(cacheKey);
    if (cachedSummary) {
      return sendSuccess(res, JSON.parse(cachedSummary), 'Summary retrieved from cache.');
    }

    // Throws 4xx/503 on failure, so only real summaries are stored and cached.
    const aiResponse = await aiService.summarizeDocument(document_id);
    await db.query(
      'UPDATE documents SET summary_text = $1, key_points = $2, updated_at = NOW() WHERE id = $3',
      [aiResponse.abstract, JSON.stringify(aiResponse.key_points || []), document_id]
    );

    await redisClient.set(cacheKey, JSON.stringify(aiResponse), { EX: 86400 });
    return sendSuccess(res, aiResponse, 'Document summary generated.');
  } catch (error) {
    next(error);
  }
};

// RAG-based Document Q&A
exports.askGemini = async (req, res, next) => {
  const { document_id, question } = req.body;
  const userId = req.user.id;

  try {
    if (!question) {
      return sendError(res, 'question parameter is required.', 400, 'VALIDATION_ERROR', req);
    }

    const scoped = document_id && document_id !== 'global';
    if (scoped) {
      const { allowed } = await canAccessDocument(userId, document_id);
      if (!allowed) {
        return sendError(res, 'Forbidden: You do not have access to this research document.', 403, 'AUTHORIZATION_ERROR', req);
      }
    }
    // "All papers" means all papers this user may read, never the whole index.
    const documentIds = scoped ? [document_id] : await accessibleIndexedDocumentIds(userId);
    if (!documentIds.length) {
      return sendSuccess(res, { answer: 'None of the papers you can read have been indexed for AI answers yet. Upload a paper or open a public one first.', citations: [], source: 'none' }, 'No papers to search.');
    }

    const withinLimit = await checkDailyAiCap(userId);
    if (!withinLimit) {
      return sendError(res, `Daily limit of ${DAILY_AI_CAP} AI queries reached.`, 429, 'RATE_LIMIT_EXCEEDED', req);
    }

    const questionHash = crypto.createHash('sha256').update(question || '').digest('hex');
    // A single paper's answer is the same for every reader; an "all papers" answer depends on who asks.
    const cacheKey = scoped ? `doc_qa:${document_id}:${questionHash}` : `doc_qa:global:${userId}:${questionHash}`;
    const cachedAnswer = await redisClient.get(cacheKey);
    if (cachedAnswer) {
      return sendSuccess(res, JSON.parse(cachedAnswer), 'Answer retrieved from cache.');
    }

    const response = await aiService.askGemini({ document_id: scoped ? document_id : null, document_ids: documentIds, question: String(question).slice(0, 2000) });
    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 86400 });

    return sendSuccess(res, response, 'AI answer generated.');
  } catch (error) {
    next(error);
  }
};

// Related Paper Recommendations (Section 62)
exports.getRecommendations = async (req, res, next) => {
  try {
    const recommendations = await aiService.getRecommendations({ user_id: req.user.id, limit: req.query.limit });
    return sendSuccess(res, recommendations, 'Research recommendations retrieved.');
  } catch (error) {
    next(error);
  }
};

// Script Generation: a reel script for one of the viewer's papers.
exports.generateScript = async (req, res, next) => {
  try {
    const { documentId } = req.body || {};
    if (!documentId) {
      return sendError(res, 'documentId is required.', 400, 'VALIDATION_ERROR', req);
    }
    const { allowed } = await canAccessDocument(req.user.id, documentId);
    if (!allowed) {
      return sendError(res, 'Forbidden: You do not have access to this document.', 403, 'AUTHORIZATION_ERROR', req);
    }
    const withinLimit = await checkDailyAiCap(req.user.id);
    if (!withinLimit) {
      return sendError(res, `Daily limit of ${DAILY_AI_CAP} AI queries reached.`, 429, 'RATE_LIMIT_EXCEEDED', req);
    }

    const doc = await documentRepository.findWithText(documentId);
    const sourceText = [doc.summary_text, doc.abstract, doc.extracted_text ? doc.extracted_text.slice(0, 14000) : null]
      .filter(Boolean).join('\n\n');
    if (!sourceText.trim()) {
      return sendError(res, 'No text could be extracted from this paper yet.', 422, 'NO_TEXT', req);
    }
    const { scenes, source } = await gemini.generateReelScript(doc.title, sourceText, doc.key_points || []);
    return sendSuccess(res, { script: { title: doc.title, scenes }, source }, 'AI video script generated.');
  } catch (error) {
    next(error);
  }
};
