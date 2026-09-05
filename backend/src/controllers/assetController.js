const crypto = require('crypto');
const documentRepository = require('../repositories/documentRepository');
const queueManager = require('../queues/queueManager');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Generates presigned S3 upload URL with server-generated key format users/{userId}/{uuid}.pdf
 */
exports.generateUploadUrl = async (req, res, next) => {
  try {
    const { fileName, mimeType } = req.body;
    const userId = req.user.id;

    if (!fileName || !mimeType) {
      return sendError(res, 'fileName and mimeType are required.', 400, 'VALIDATION_ERROR', req);
    }

    const fileExt = fileName.includes('.') ? fileName.split('.').pop() : 'pdf';
    const storageKey = `users/${userId}/${crypto.randomUUID()}.${fileExt}`;
    
    // Signed upload URL simulation / S3 URL
    const uploadUrl = process.env.S3_UPLOAD_ENDPOINT 
      ? `${process.env.S3_UPLOAD_ENDPOINT}/${storageKey}`
      : `https://mock-s3.local/upload?key=${encodeURIComponent(storageKey)}`;

    return sendSuccess(res, {
      uploadUrl,
      storageKey,
      bucket: process.env.S3_BUCKET || 'researchreel-documents'
    }, 'Signed upload URL generated.');
  } catch (error) {
    next(error);
  }
};

/**
 * Registers the uploaded asset into the PostgreSQL documents table
 */
exports.registerAsset = async (req, res, next) => {
  try {
    const { fileName, mimeType, sizeBytes, storageKey, fileUrl, metadata } = req.body;
    const userId = req.user.id;

    if (!fileName || !storageKey) {
      return sendError(res, 'fileName and storageKey are required.', 400, 'VALIDATION_ERROR', req);
    }

    const document = await documentRepository.createDocument({
      ownerId: userId,
      title: fileName,
      storageKey,
      fileUrl: fileUrl || `https://storage.local/${storageKey}`,
      mimeType: mimeType || 'application/pdf',
      fileSize: sizeBytes || 0,
      metadata: metadata || {}
    });

    // Enqueue background processing job (PDF parsing, text extraction, chunking)
    await queueManager.addJob('document-processing', {
      documentId: document.id,
      storageKey: document.storage_key,
      ownerId: userId
    });

    return sendSuccess(res, document, 'Document registered and queued for processing.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Soft deletes an asset/document
 */
exports.softDeleteAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const success = await documentRepository.softDelete(id, userId);
    if (!success) {
      return sendError(res, 'Document not found or unauthorized.', 404, 'NOT_FOUND', req);
    }

    return sendSuccess(res, { id }, 'Document soft-deleted successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves library of non-deleted assets for the authenticated user
 */
exports.getUserAssets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const assets = await documentRepository.findByOwner(userId);
    return sendSuccess(res, assets, 'User document library retrieved.');
  } catch (error) {
    next(error);
  }
};
