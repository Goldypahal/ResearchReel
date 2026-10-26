const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const documentRepository = require('../repositories/documentRepository');
const { processDocument, uploadsRoot } = require('../services/documentProcessor');
const { canAccessDocument } = require('../authorization/documentAuthorization');
const { sendSuccess, sendError } = require('../utils/response');

const ALLOWED = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

/** Absolute URL for a file under /uploads, so the web app (other origin) can load it. */
const publicUrl = (req, relativePath) => {
  const origin = process.env.PUBLIC_API_ORIGIN || `${req.protocol}://${req.get('host')}`;
  return `${origin.replace(/\/$/, '')}/uploads/${relativePath}`;
};

/**
 * Direct multipart upload (field "file"). The file is stored under
 * public/uploads/documents/<userId>/, registered as a document, and text
 * extraction runs after the response so the client is not kept waiting.
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'Attach a PDF or DOCX file in the "file" field.', 400, 'VALIDATION_ERROR', req);
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    const userDir = path.join(uploadsRoot, 'documents', req.user.id);
    fs.mkdirSync(userDir, { recursive: true });
    const storedName = `${crypto.randomUUID()}${ext}`;
    const finalPath = path.join(userDir, storedName);
    fs.renameSync(req.file.path, finalPath);

    const relative = `documents/${req.user.id}/${storedName}`;
    const providedTitle = (req.body.title || '').trim();
    const document = await documentRepository.createDocument({
      ownerId: req.user.id,
      title: providedTitle || req.file.originalname.replace(/\.[^.]+$/, ''),
      fileName: req.file.originalname,
      fileUrl: publicUrl(req, relative),
      storageKey: relative,
      mimeType: ALLOWED[ext],
      fileSize: req.file.size,
      doi: (req.body.doi || '').trim() || null,
      status: 'processing'
    });

    setImmediate(() => {
      processDocument(document.id, finalPath, ALLOWED[ext], { useExtractedTitle: !providedTitle });
    });

    return sendSuccess(res, document, 'Document uploaded. Extracting text…', 201);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
    next(error);
  }
};

const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v));

exports.getAsset = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Document not found.', 404, 'NOT_FOUND', req);
    const { allowed, permission } = await canAccessDocument(req.user.id, req.params.id);
    if (!allowed) return sendError(res, 'Document not found.', 404, 'NOT_FOUND', req);
    const doc = await documentRepository.findById(req.params.id);
    return sendSuccess(res, { ...doc, permission }, 'Document fetched.');
  } catch (error) {
    next(error);
  }
};

/** Owner edits: title, DOI and who can see the paper. */
exports.updateAsset = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Document not found.', 404, 'NOT_FOUND', req);
    const { title, doi, visibility } = req.body || {};
    if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.length > 500)) {
      return sendError(res, 'Title must be 1-500 characters.', 400, 'VALIDATION_ERROR', req);
    }
    if (doi !== undefined && doi !== null && doi !== '' && !/^10\.\d{4,9}\/\S+$/.test(String(doi).trim())) {
      return sendError(res, 'That does not look like a DOI (it should start with 10.).', 400, 'VALIDATION_ERROR', req);
    }
    if (visibility !== undefined && !['private', 'public'].includes(visibility)) {
      return sendError(res, 'visibility must be private or public.', 400, 'VALIDATION_ERROR', req);
    }
    const doc = await documentRepository.updateOwned(req.params.id, req.user.id, {
      title: title === undefined ? undefined : title.trim(),
      doi: doi === undefined ? undefined : (String(doi || '').trim() || null),
      visibility,
    });
    if (!doc) return sendError(res, 'Document not found.', 404, 'NOT_FOUND', req);
    return sendSuccess(res, doc, 'Document updated.');
  } catch (error) {
    next(error);
  }
};

exports.softDeleteAsset = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Document not found.', 404, 'NOT_FOUND', req);
    const success = await documentRepository.softDelete(req.params.id, req.user.id);
    if (!success) {
      return sendError(res, 'Document not found or unauthorized.', 404, 'NOT_FOUND', req);
    }
    return sendSuccess(res, { id: req.params.id }, 'Document deleted.');
  } catch (error) {
    next(error);
  }
};

exports.getUserAssets = async (req, res, next) => {
  try {
    const assets = await documentRepository.findByOwner(req.user.id);
    return sendSuccess(res, assets, 'User document library retrieved.');
  } catch (error) {
    next(error);
  }
};

exports.ALLOWED = ALLOWED;
