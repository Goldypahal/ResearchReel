const express = require('express');
const router = express.Router();
const doiController = require('../controllers/doiController');
const { authMiddleware } = require('../middleware/authMiddleware');

// GET /api/doi/paper?doi=10.xxxx/xxxxx  — fetch single paper metadata
router.get('/paper', doiController.getPaperByDOI);

// GET /api/doi/author?orcid=0000-0001-2345-6789  — fetch all papers by author ORCID
router.get('/author', doiController.getPapersByORCID);

// POST /api/doi/import  — batch import by DOI list (requires auth)
router.post('/import', authMiddleware, doiController.importByDOIs);

module.exports = router;
