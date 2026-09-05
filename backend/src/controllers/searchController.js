const searchService = require('../services/searchService');
const { sendSuccess } = require('../utils/response');

exports.search = async (req, res, next) => {
  try {
    const { q, type, cursor, limit } = req.query;
    const result = await searchService.searchDocuments(q || '', type || 'all', cursor, parseInt(limit) || 10);
    return sendSuccess(res, result.results, 'Search results fetched.');
  } catch (error) {
    next(error);
  }
};
