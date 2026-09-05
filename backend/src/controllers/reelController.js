const reelService = require('../services/reelGeneratorService');
const { canAccessDocument } = require('../authorization/documentAuthorization');
const { canAccessReel } = require('../authorization/reelAuthorization');
const queueManager = require('../queues/queueManager');
const { sendSuccess, sendError } = require('../utils/response');

exports.getDrafts = async (req, res, next) => {
  try {
    const drafts = await reelService.getDrafts(req.user.id);
    return sendSuccess(res, drafts, 'User reel drafts retrieved.');
  } catch (error) {
    next(error);
  }
};

exports.getDraft = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allowed } = await canAccessReel(req.user.id, id);
    if (!allowed) {
      return sendError(res, 'Forbidden: You do not have access to this reel draft.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const draft = await reelService.getDraftById(id, req.user.id);
    if (!draft) {
      return sendError(res, 'Reel draft not found.', 404, 'NOT_FOUND', req);
    }
    return sendSuccess(res, draft, 'Reel draft fetched.');
  } catch (error) {
    next(error);
  }
};

exports.generateDraft = async (req, res, next) => {
  try {
    const { document_id, split_mode, parts_mode, parts_count, title } = req.body;
    if (!document_id) {
      return sendError(res, 'document_id is required.', 400, 'VALIDATION_ERROR', req);
    }

    // Document access authorization check (Section 33)
    const { allowed } = await canAccessDocument(req.user.id, document_id);
    if (!allowed) {
      return sendError(res, 'Forbidden: You do not have access to this document.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const draft = await reelService.generateDraftFromPaper(document_id, req.user.id, {
      split_mode,
      parts_mode,
      parts_count,
      title
    });

    // Queue reel generation background job (Section 34: Return 202 Accepted)
    await queueManager.addJob('reel-generation', {
      reelId: draft.id,
      documentId: document_id,
      authorId: req.user.id
    });

    return sendSuccess(res, draft, 'Reel draft created and processing queued.', 202);
  } catch (error) {
    next(error);
  }
};

exports.updateDraft = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allowed, isAuthor } = await canAccessReel(req.user.id, id);
    if (!allowed || !isAuthor) {
      return sendError(res, 'Forbidden: Only the reel author can update this draft.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const draft = await reelService.updateDraft(id, req.user.id, req.body);
    return sendSuccess(res, draft, 'Reel draft updated.');
  } catch (error) {
    next(error);
  }
};

exports.publishDraft = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { allowed, isAuthor } = await canAccessReel(req.user.id, id);
    if (!allowed || !isAuthor) {
      return sendError(res, 'Forbidden: Only the reel author can publish this draft.', 403, 'AUTHORIZATION_ERROR', req);
    }

    const result = await reelService.publishDraft(id, req.user.id);
    return sendSuccess(res, result, 'Reel published successfully.');
  } catch (error) {
    next(error);
  }
};

exports.getAutomation = async (req, res, next) => {
  try {
    const settings = await reelService.getAutomationSettings(req.user.id);
    return sendSuccess(res, settings, 'Reel automation settings retrieved.');
  } catch (error) {
    next(error);
  }
};

exports.updateAutomation = async (req, res, next) => {
  try {
    const settings = await reelService.updateAutomationSettings(req.user.id, req.body);
    return sendSuccess(res, settings, 'Reel automation settings updated.');
  } catch (error) {
    next(error);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const documents = await reelService.getUserDocuments(req.user.id);
    return sendSuccess(res, documents, 'Available user documents fetched.');
  } catch (error) {
    next(error);
  }
};
