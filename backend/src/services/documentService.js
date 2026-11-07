const db = require('../config/db');
const storageService = require('./storageService');

const MAX_TEXT = 1_000_000;

/** Extracts text/metadata from a PDF buffer. Never throws: scanned/encrypted PDFs simply yield no text. */
const extractPdf = async (buffer) => {
  let parser;
  try {
    const { PDFParse } = require('pdf-parse');
    parser = new PDFParse({ data: buffer });
    const text = await parser.getText();
    let info = {};
    try { info = (await parser.getInfo())?.info || {}; } catch (e) { /* optional */ }
    const cleaned = (text.text || '').replace(/-- \d+ of \d+ --/g, '').replace(/\u0000/g, '').trim();
    return { text: cleaned.slice(0, MAX_TEXT), pages: text.total || null, title: info.Title || null, author: info.Author || null };
  } catch (err) {
    console.warn('[documents] PDF text extraction failed:', err.message);
    return { text: '', pages: null, title: null, author: null };
  } finally {
    try { if (parser) await parser.destroy(); } catch (e) { /* ignore */ }
  }
};

/** Pulls a plausible abstract out of the paper text when the uploader didn't provide one. */
const guessAbstract = (text) => {
  if (!text) return null;
  const m = text.match(/abstract[\s:.\-—]*([\s\S]{80,2000}?)(?:\n\s*\n|\b(?:1\.?\s*)?introduction\b|keywords?:)/i);
  const candidate = (m ? m[1] : text.slice(0, 1200)).replace(/\s+/g, ' ').trim();
  return candidate.length >= 60 ? candidate.slice(0, 1500) : null;
};

const DOC_COLUMNS = `
  d.id, d.uploader_id, COALESCE(d.title, d.file_name) AS title, d.file_name, d.file_url, d.file_type, d.mime_type,
  d.file_size, d.page_count, d.abstract, d.summary_text, d.key_points, d.authors, d.doi, d.publication_year,
  d.journal, d.tags, d.visibility, d.status, d.source, d.external_url, d.citation_count, d.rag_status, d.created_at, d.updated_at,
  u.username AS uploader_username, u.full_name AS uploader_name, u.profile_picture_url AS uploader_avatar_url
`;

const createFromUpload = async ({ file, userId, fields = {} }) => {
  const saved = await storageService.saveFile({
    buffer: file.buffer, originalName: file.originalname, mimeType: file.mimetype, folder: 'documents'
  });
  const meta = await extractPdf(file.buffer);

  const title = (fields.title || meta.title || file.originalname.replace(/\.pdf$/i, '')).toString().trim().slice(0, 500);
  const authors = Array.isArray(fields.authors)
    ? fields.authors
    : (fields.authors ? String(fields.authors).split(/[,;]/).map((a) => a.trim()).filter(Boolean) : (meta.author ? [meta.author] : []));
  const tags = Array.isArray(fields.tags)
    ? fields.tags
    : (fields.tags ? String(fields.tags).split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean).slice(0, 20) : []);
  const abstract = (fields.abstract && String(fields.abstract).trim()) || guessAbstract(meta.text);
  const year = parseInt(fields.publication_year, 10);
  const visibility = fields.visibility === 'private' ? 'private' : 'public';

  const r = await db.query(
    `INSERT INTO documents (uploader_id, file_name, file_type, file_url, storage_key, mime_type, file_size, page_count,
                            title, abstract, authors, doi, publication_year, journal, tags, visibility, status, extracted_text)
     VALUES ($1, $2, 'pdf', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'ready', $16)
     RETURNING id`,
    [userId, file.originalname.slice(0, 255), saved.url, saved.key, file.mimetype, saved.size, meta.pages,
      title, abstract, authors.slice(0, 50), fields.doi ? String(fields.doi).trim().slice(0, 255) : null,
      Number.isFinite(year) && year > 1500 && year < 2100 ? year : null,
      fields.journal ? String(fields.journal).trim().slice(0, 300) : null, tags, visibility, meta.text]
  );
  return getById(r.rows[0].id);
};

const getById = async (id) => {
  const r = await db.query(`SELECT ${DOC_COLUMNS} FROM documents d JOIN users u ON u.id = d.uploader_id WHERE d.id = $1 AND d.deleted_at IS NULL`, [id]);
  return r.rows[0] || null;
};

module.exports = { createFromUpload, getById, extractPdf, guessAbstract, DOC_COLUMNS };
