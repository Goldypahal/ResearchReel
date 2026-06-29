const aiService = require('../services/aiService');
const db = require('../config/db');

// Document Summarization (Section 4.2.1)
exports.summarizeDocument = async (req, res) => {
  const { document_id } = req.body;

  try {
    const aiResponse = await aiService.summarizeDocument(document_id);
    await db.query(
      'UPDATE documents SET summary_text = $1, key_points = $2 WHERE id = $3',
      [aiResponse.abstract, JSON.stringify(aiResponse.key_points), document_id]
    );

    res.status(200).json({ success: true, data: aiResponse });
  } catch (error) {
    console.error('Summarization Error:', error);
    res.status(500).json({ success: false, message: 'Summarization failed' });
  }
};

// RAG-based Document Q&A (Section 4.2.2)
exports.askGemini = async (req, res) => {
  try {
    const response = await aiService.askGemini(req.body);
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
