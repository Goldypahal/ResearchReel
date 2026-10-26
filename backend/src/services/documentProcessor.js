const fs = require('fs');
const path = require('path');
const db = require('../config/db');

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
         status = 'ready',
         updated_at = NOW()
       WHERE id = $1`,
      [documentId, text ? deriveAbstract(text) : null, doiMatch ? doiMatch[1].replace(/[.,;]$/, '') : null, title, pages, text.length, useExtractedTitle]
    );
  } catch (err) {
    console.error(`[documents] processing failed for ${documentId}:`, err.message);
    await db.query(
      `UPDATE documents SET status = 'failed', metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('error', $2::text), updated_at = NOW() WHERE id = $1`,
      [documentId, err.message.slice(0, 300)]
    ).catch(() => {});
  }
};

const uploadsRoot = path.join(__dirname, '../../public/uploads');

module.exports = { processDocument, extractText, deriveAbstract, uploadsRoot };
