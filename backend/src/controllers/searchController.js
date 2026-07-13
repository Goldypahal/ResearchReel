const searchService = require('../services/searchService');

exports.search = async (req, res) => {
  try {
    const { q, type, cursor, limit } = req.query;
    const result = await searchService.searchDocuments(q || '', type || 'all', cursor, parseInt(limit) || 10);
    res.status(200).json({ success: true, data: result.results, nextCursor: result.nextCursor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};

