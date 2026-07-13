const citationService = require('../services/citationService');
const logger = require('../utils/logger');

exports.getGraph = async (req, res) => {
  try {
    const { doi } = req.params;
    if (!doi) {
      return res.status(400).json({ error: 'DOI parameter is required' });
    }

    const graph = await citationService.getPaperGraph(doi);
    res.status(200).json(graph);
  } catch (error) {
    logger.error('Error in citationController.getGraph:', error);
    res.status(500).json({ error: 'Failed to retrieve citation graph' });
  }
};

exports.addPaper = async (req, res) => {
  try {
    const { doi, title, publishedYear } = req.body;
    if (!doi || !title) {
      return res.status(400).json({ error: 'DOI and title are required' });
    }

    const paper = await citationService.createOrUpdatePaper({ doi, title, publishedYear });
    res.status(201).json(paper);
  } catch (error) {
    logger.error('Error in citationController.addPaper:', error);
    res.status(500).json({ error: 'Failed to add paper' });
  }
};

exports.addCitation = async (req, res) => {
  try {
    const { sourceDoi, targetDoi, sentiment } = req.body;
    if (!sourceDoi || !targetDoi) {
      return res.status(400).json({ error: 'sourceDoi and targetDoi are required' });
    }

    await citationService.addCitation(sourceDoi, targetDoi, sentiment);
    res.status(201).json({ message: 'Citation added successfully' });
  } catch (error) {
    logger.error('Error in citationController.addCitation:', error);
    res.status(500).json({ error: 'Failed to add citation' });
  }
};
