const aiService = require('../services/aiService');
const db = require('../config/db');
const redisClient = require('../config/redisClient');
const crypto = require('crypto');

// Daily cap limit (cost control)
const DAILY_AI_CAP = 50;

// Helper to check and increment user daily AI cap
const checkDailyAiCap = async (userId) => {
  const today = new Date().toISOString().split('T')[0];
  const redisKey = `ai_cap:${userId}:${today}`;
  
  try {
    const currentCount = await redisClient.get(redisKey);
    if (currentCount && parseInt(currentCount) >= DAILY_AI_CAP) {
      return false;
    }
    // Set counter with 24 hours expiry if not exists, otherwise increment
    if (!currentCount) {
      await redisClient.set(redisKey, '1', { EX: 86400 });
    } else {
      await redisClient.incr(redisKey);
    }
    return true;
  } catch (err) {
    console.error('Failed checking AI daily cap in Redis:', err.message);
    // Graceful fallback: allow query if Redis fails
    return true;
  }
};

// Document Summarization (Section 4.2.1)
exports.summarizeDocument = async (req, res) => {
  const { document_id } = req.body;
  const userId = req.user?.id;

  try {
    if (userId) {
      const withinLimit = await checkDailyAiCap(userId);
      if (!withinLimit) {
        return res.status(429).json({
          success: false,
          message: `You have reached your daily limit of ${DAILY_AI_CAP} AI queries. Please try again tomorrow.`
        });
      }
    }

    // Try Redis cache first
    const cacheKey = `doc_summary:${document_id}`;
    const cachedSummary = await redisClient.get(cacheKey);
    if (cachedSummary) {
      return res.status(200).json({ success: true, data: JSON.parse(cachedSummary), source: 'cache' });
    }

    const aiResponse = await aiService.summarizeDocument(document_id);
    await db.query(
      'UPDATE documents SET summary_text = $1, key_points = $2 WHERE id = $3',
      [aiResponse.abstract, JSON.stringify(aiResponse.key_points), document_id]
    );

    // Save to Redis cache for 24h
    await redisClient.set(cacheKey, JSON.stringify(aiResponse), { EX: 86400 });

    res.status(200).json({ success: true, data: aiResponse });
  } catch (error) {
    console.error('Summarization Error:', error);
    res.status(500).json({ success: false, message: 'Summarization failed' });
  }
};

// RAG-based Document Q&A (Section 4.2.2)
exports.askGemini = async (req, res) => {
  const { document_id, question } = req.body;
  const userId = req.user?.id;

  try {
    if (userId) {
      const withinLimit = await checkDailyAiCap(userId);
      if (!withinLimit) {
        return res.status(429).json({
          success: false,
          message: `You have reached your daily limit of ${DAILY_AI_CAP} AI queries. Please try again tomorrow.`
        });
      }
    }

    // Try Redis cache first
    const questionHash = crypto.createHash('md5').update(question || '').digest('hex');
    const cacheKey = `doc_qa:${document_id || 'global'}:${questionHash}`;
    const cachedAnswer = await redisClient.get(cacheKey);
    if (cachedAnswer) {
      return res.status(200).json({ success: true, data: JSON.parse(cachedAnswer), source: 'cache' });
    }

    const response = await aiService.askGemini(req.body);

    // Save to Redis cache for 24h
    await redisClient.set(cacheKey, JSON.stringify(response), { EX: 86400 });

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error('AI Controller Error:', error);
    res.status(500).json({ success: false, message: 'RAG service unreachable or failed' });
  }
};

// Related Paper Recommendations (Section 4.2.3)
exports.getRecommendations = async (req, res) => {
  try {
    const recommendations = await aiService.getRecommendations(req.query);
    res.status(200).json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Recommendation Error:', error);
    res.status(500).json({ success: false, message: 'Recommendation failed' });
  }
};

/**
 * MOCK: Generates a JSON video script based on a document query.
 * In production, this calls Gemini 1.5 Flash via Vertex AI / Google AI Studio.
 */
exports.generateScript = async (req, res, next) => {
  try {
    const { documentId, query } = req.body;
    
    // Fake processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // MOCK Output based on Phase 11 Schema
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

    res.status(200).json({
      status: 'success',
      script: mockScript
    });
  } catch (error) {
    next(error);
  }
};

/**
 * MOCK: Synthesizes voice audio from text.
 * In production, this calls Edge-TTS or Google Cloud TTS.
 */
exports.generateVoice = async (req, res, next) => {
  try {
    const { text, voiceId } = req.body;

    // Fake processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // MOCK output
    res.status(200).json({
      status: 'success',
      audioUrl: 'https://mock-s3.local/temp/voice_output_abc123.mp3',
      durationSeconds: 4.5
    });
  } catch (error) {
    next(error);
  }
};

