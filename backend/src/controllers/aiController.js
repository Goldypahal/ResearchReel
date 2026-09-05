const aiService = require('../services/aiService');
const db = require('../config/db');
const redisClient = require('../config/redisClient');
const crypto = require('crypto');
const { canAccessDocument } = require('../authorization/documentAuthorization');
const { sendSuccess, sendError } = require('../utils/response');

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

    const aiResponse = await aiService.summarizeDocument(document_id);
    await db.query(
      'UPDATE documents SET summary_text = $1, key_points = $2 WHERE id = $3',
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

    if (document_id && document_id !== 'global') {
      const { allowed } = await canAccessDocument(userId, document_id);
      if (!allowed) {
        return sendError(res, 'Forbidden: You do not have access to this research document.', 403, 'AUTHORIZATION_ERROR', req);
      }
    }

    const withinLimit = await checkDailyAiCap(userId);
    if (!withinLimit) {
      return sendError(res, `Daily limit of ${DAILY_AI_CAP} AI queries reached.`, 429, 'RATE_LIMIT_EXCEEDED', req);
    }

    const questionHash = crypto.createHash('md5').update(question || '').digest('hex');
    const cacheKey = `doc_qa:${document_id || 'global'}:${questionHash}`;
    const cachedAnswer = await redisClient.get(cacheKey);
    if (cachedAnswer) {
      return sendSuccess(res, JSON.parse(cachedAnswer), 'Answer retrieved from cache.');
    }

    const response = await aiService.askGemini(req.body);
    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 86400 });

    return sendSuccess(res, response, 'AI answer generated.');
  } catch (error) {
    next(error);
  }
};

// Related Paper Recommendations (Section 62)
exports.getRecommendations = async (req, res, next) => {
  try {
    const recommendations = await aiService.getRecommendations(req.query);
    return sendSuccess(res, recommendations, 'Research recommendations retrieved.');
  } catch (error) {
    next(error);
  }
};

// Script Generation
exports.generateScript = async (req, res, next) => {
  try {
    const { documentId, query } = req.body;

    if (documentId) {
      const { allowed } = await canAccessDocument(req.user.id, documentId);
      if (!allowed) {
        return sendError(res, 'Forbidden: You do not have access to this document.', 403, 'AUTHORIZATION_ERROR', req);
      }
    }

    const mockScript = {
      title: "Generated Research Script",
      scenes: [
        {
          scene_number: 1,
          narration: "Recent advancements in quantum entanglement have paved the way for robust cryptographic protocols.",
          caption: "Quantum Cryptography 101",
          visual_prompt: "Abstract visualization of glowing connected quantum nodes."
        },
        {
          scene_number: 2,
          narration: "By utilizing the Bell state, scientists proved that information transfer exceeds classical bounds.",
          caption: "Breaking Classical Bounds",
          visual_prompt: "Data stream accelerating beyond light speed graphics."
        }
      ]
    };

    return sendSuccess(res, { script: mockScript }, 'AI video script generated.');
  } catch (error) {
    next(error);
  }
};

// Voice Audio Synthesis
exports.generateVoice = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      return sendError(res, 'text content is required for voice generation.', 400, 'VALIDATION_ERROR', req);
    }

    return sendSuccess(res, {
      audioUrl: 'https://mock-s3.local/temp/voice_output_abc123.mp3',
      durationSeconds: 4.5
    }, 'Voice synthesis completed.');
  } catch (error) {
    next(error);
  }
};
