const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const ragService = require('./ai/ragService');

const MAX_STORED_TEXT = 400000;

const MAX_ABSTRACT_CHARS = 1500;
const DOI_PATTERN = /\b(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i;

const extractText = async (filePath, mimeType) => {
  const buffer = fs.readFileSync(filePath);
  if (mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const text = await parser.getText();
      const info = await parser.getInfo().catch(() => null);
      return { text: text.text || '', pages: text.total || null, title: info?.info?.Title || null };
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
  if (filePath.toLowerCase().endsWith('.docx')) {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value || '', pages: null, title: null };
  }
  return { text: '', pages: null, title: null };
};

/** Prefer an explicit "Abstract" section; otherwise the opening text. */
const deriveAbstract = (text) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  const match = clean.match(/\babstract\b[\s.:—-]*(.{80,})/i);
  const body = match ? match[1] : clean;
  if (body.length <= MAX_ABSTRACT_CHARS) return body;
  const cut = body.slice(0, MAX_ABSTRACT_CHARS);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
};

/**
 * Extracts text from an uploaded paper, fills abstract / DOI / page count and
 * marks the document ready (or failed). Runs after the upload response is sent.
 */
const processDocument = async (documentId, filePath, mimeType, { useExtractedTitle = false } = {}) => {
  try {
    const { text, pages, title } = await extractText(filePath, mimeType);
    const doiMatch = text.match(DOI_PATTERN);
    await db.query(
      `UPDATE documents SET
         abstract = COALESCE(NULLIF(abstract, ''), $2),
         doi = COALESCE(doi, $3),
         title = CASE WHEN $7::boolean AND $4::text IS NOT NULL AND length($4) > 3 THEN $4 ELSE title END,
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('pages', $5::int, 'characters', $6::int),
         extracted_text = $8,
         status = 'ready',
         updated_at = NOW()
       WHERE id = $1`,
      [documentId, text ? deriveAbstract(text) : null, doiMatch ? doiMatch[1].replace(/[.,;]$/, '') : null, title, pages, text.length, useExtractedTitle,
        text ? text.slice(0, MAX_STORED_TEXT) : null]
    );
    await indexForAi(documentId, filePath, mimeType);
    await afterReady(documentId);
  } catch (err) {
    console.error(`[documents] processing failed for ${documentId}:`, err.message);
    await db.query(
      `UPDATE documents SET status = 'failed', metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('error', $2::text), updated_at = NOW() WHERE id = $1`,
      [documentId, err.message.slice(0, 300)]
    ).catch(() => {});
  }
};

/**
 * Sends a PDF to the RAG service so AI Q&A can cite it. The RAG paper id is the
 * document id. Best effort: if the service is down the paper still works, and
 * AI features fall back to the stored text.
 */
const indexForAi = async (documentId, filePath, mimeType) => {
  if (mimeType !== 'application/pdf' || !ragService.isConfigured()) return;
  try {
    await ragService.ingestDocument(fs.readFileSync(filePath), `${documentId}.pdf`);
    await db.query('UPDATE documents SET rag_indexed_at = NOW() WHERE id = $1', [documentId]);
  } catch (err) {
    console.warn(`[documents] RAG indexing skipped for ${documentId}: ${err.message}`);
  }
};

/** Search indexing and the optional "auto-generate a reel" hook, once the paper is readable. */
const afterReady = async (documentId) => {
  try {
    const { rows } = await db.query('SELECT id, uploader_id, title, abstract, doi, file_name, visibility FROM documents WHERE id = $1', [documentId]);
    const doc = rows[0];
    if (!doc) return;
    const searchService = require('./searchService');
    await searchService.indexEntity('documents', doc.id, {
      id: doc.id, title: doc.title, abstract: doc.abstract, doi: doc.doi, file_name: doc.file_name, uploader_id: doc.uploader_id, visibility: doc.visibility,
    });
    const reelGeneratorService = require('./reelGeneratorService');
    await reelGeneratorService.handleNewPaperUpload(doc.id, doc.uploader_id);
  } catch (err) {
    console.warn(`[documents] post-processing hooks failed for ${documentId}: ${err.message}`);
  }
};

const uploadsRoot = path.join(__dirname, '../../public/uploads');

module.exports = { processDocument, extractText, deriveAbstract, indexForAi, uploadsRoot };
