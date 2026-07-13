const reelService = require('../services/reelGeneratorService');

exports.getDrafts = async (req, res) => {
  try {
    const drafts = await reelService.getDrafts(req.user.id);
    res.status(200).json({ success: true, data: drafts });
  } catch (error) {
    console.error('[Reel Controller] Error fetching drafts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch drafts' });
  }
};

exports.getDraft = async (req, res) => {
  try {
    const draft = await reelService.getDraftById(req.params.id, req.user.id);
    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }
    res.status(200).json({ success: true, data: draft });
  } catch (error) {
    console.error('[Reel Controller] Error fetching draft:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch draft' });
  }
};

exports.generateDraft = async (req, res) => {
  try {
    const { document_id, split_mode, parts_mode, parts_count } = req.body;
    if (!document_id) {
      return res.status(400).json({ success: false, message: 'document_id is required' });
    }

    const data = await reelService.generateDraftFromPaper(document_id, req.user.id, {
      split_mode,
      parts_mode,
      parts_count
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('[Reel Controller] Error generating draft:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate draft' });
  }
};

exports.updateDraft = async (req, res) => {
  try {
    const draft = await reelService.updateDraft(req.params.id, req.user.id, req.body);
    res.status(200).json({ success: true, data: draft });
  } catch (error) {
    console.error('[Reel Controller] Error updating draft:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update draft' });
  }
};

exports.publishDraft = async (req, res) => {
  try {
    const result = await reelService.publishDraft(req.params.id, req.user.id);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('[Reel Controller] Error publishing draft:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to publish draft' });
  }
};

exports.getAutomation = async (req, res) => {
  try {
    const settings = await reelService.getAutomationSettings(req.user.id);
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('[Reel Controller] Error getting automation settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch automation settings' });
  }
};

exports.updateAutomation = async (req, res) => {
  try {
    const settings = await reelService.updateAutomationSettings(req.user.id, req.body);
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('[Reel Controller] Error updating automation settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update automation settings' });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const documents = await reelService.getUserDocuments(req.user.id);
    res.status(200).json({ success: true, data: documents });
  } catch (error) {
    console.error('[Reel Controller] Error fetching user documents:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
};
