const searchService = require('../services/searchService');

exports.search = async (req, res) => {
  try {
    const { q, type } = req.query;
    const results = await searchService.searchDocuments(q || '', type || 'all');
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};

