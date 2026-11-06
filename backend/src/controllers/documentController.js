const db = require('../config/db');
const documentService = require('../services/documentService');
const { DOC_COLUMNS } = require('../services/documentService');
const storageService = require('../services/storageService');
const { canAccessDocument } = require('../authorization/documentAuthorization');
const { sendSuccess, sendError } = require('../utils/response');
const { parsePage, nextCursorOf, isUuid } = require('../utils/pagination');

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'Choose a PDF to upload.', 400, 'VALIDATION_ERROR', req);
    const doc = await documentService.createFromUpload({ file: req.file, userId: req.user.id, fields: req.body || {} });
    // Optional automation: generate (and maybe publish) a reel for the new paper in the background.
    require('../services/reelGeneratorService').handleNewPaperUpload(doc.id, req.user.id).catch(() => {});
    return sendSuccess(res, doc, 'Paper uploaded.', 201);
  } catch (error) {
    next(error);
  }
};

/** GET /documents?scope=mine|public&q=&author=username */
exports.list = async (req, res, next) => {
  try {
    const { limit, cursor } = parsePage(req.query, 20, 50);
    const scope = req.query.scope === 'mine' ? 'mine' : 'public';
    if (scope === 'mine' && !req.user) return sendError(res, 'Sign in to see your library.', 401, 'AUTHENTICATION_ERROR', req);

    const params = [];
    const where = ['d.deleted_at IS NULL'];
    if (scope === 'mine') {
      params.push(req.user.id); where.push(`d.uploader_id = $${params.length}`);
    } else {
      where.push(`d.visibility = 'public'`);
    }
    if (req.query.author) {
      params.push(String(req.query.author)); where.push(`LOWER(u.username) = LOWER($${params.length})`);
    }
    if (req.query.q) {
      params.push(`%${String(req.query.q).slice(0, 200)}%`);
      const p = `$${params.length}`;
      where.push(`(COALESCE(d.title, d.file_name) ILIKE ${p} OR d.abstract ILIKE ${p} OR array_to_string(d.authors, ' ') ILIKE ${p} OR array_to_string(d.tags, ' ') ILIKE ${p} OR d.doi ILIKE ${p})`);
    }
    if (cursor) { params.push(cursor); where.push(`d.created_at < $${params.length}`); }
    params.push(limit);

    const r = await db.query(
      `SELECT ${DOC_COLUMNS},
              EXISTS (SELECT 1 FROM project_documents pd WHERE pd.document_id = d.id) AS in_project
         FROM documents d JOIN users u ON u.id = d.uploader_id
        WHERE ${where.join(' AND ')}
        ORDER BY d.created_at DESC
        LIMIT $${params.length}`,
      params
    );
    return sendSuccess(res, { documents: r.rows, nextCursor: nextCursorOf(r.rows, limit) }, 'Documents.');
  } catch (error) {
    next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Document not found.', 404, 'NOT_FOUND', req);
    const { allowed, permission } = await canAccessDocument(req.user?.id, req.params.id);
    if (!allowed) return sendError(res, 'Document not found.', 404, 'NOT_FOUND', req);
    const doc = await documentService.getById(req.params.id);
    if (!doc) return sendError(res, 'Document not found.', 404, 'NOT_FOUND', req);
    const reels = await db.query(
      `SELECT id, title, thumbnail_url, video_url, created_at FROM videos
        WHERE linked_paper_id = $1 AND deleted_at IS NULL AND visibility = 'public' ORDER BY created_at DESC LIMIT 10`,
      [doc.id]
    );
    return sendSuccess(res, { ...doc, permission, reels: reels.rows }, 'Document.');
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Document not found.', 404, 'NOT_FOUND', req);
    const own = await db.query('SELECT 1 FROM documents WHERE id = $1 AND uploader_id = $2 AND deleted_at IS NULL', [req.params.id, req.user.id]);
    if (!own.rows.length) return sendError(res, 'Only the uploader can edit this paper.', 403, 'AUTHORIZATION_ERROR', req);
    const b = req.body || {};
    const toArr = (v, max) => (Array.isArray(v) ? v : (typeof v === 'string' ? v.split(',') : null))?.map((x) => String(x).trim()).filter(Boolean).slice(0, max);
    const year = b.publication_year === undefined ? undefined : parseInt(b.publication_year, 10);
    await db.query(
      `UPDATE documents SET
          title = COALESCE($1, title), abstract = COALESCE($2, abstract), authors = COALESCE($3, authors),
          doi = COALESCE($4, doi), journal = COALESCE($5, journal), tags = COALESCE($6, tags),
          visibility = COALESCE($7, visibility), publication_year = COALESCE($8, publication_year), updated_at = NOW()
        WHERE id = $9`,
      [b.title ? String(b.title).slice(0, 500) : null, b.abstract ? String(b.abstract).slice(0, 5000) : null,
        toArr(b.authors, 50) || null, b.doi ? String(b.doi).slice(0, 255) : null, b.journal ? String(b.journal).slice(0, 300) : null,
        toArr(b.tags, 20) || null, ['public', 'private'].includes(b.visibility) ? b.visibility : null,
        Number.isFinite(year) ? year : null, req.params.id]
    );
    return sendSuccess(res, await documentService.getById(req.params.id), 'Paper updated.');
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return sendError(res, 'Document not found.', 404, 'NOT_FOUND', req);
    const r = await db.query(
      `UPDATE documents SET deleted_at = NOW() WHERE id = $1 AND uploader_id = $2 AND deleted_at IS NULL RETURNING storage_key`,
      [req.params.id, req.user.id]
    );
    if (!r.rows.length) return sendError(res, 'Document not found.', 404, 'NOT_FOUND', req);
    await storageService.deleteFile(r.rows[0].storage_key);
    return sendSuccess(res, { id: req.params.id }, 'Paper deleted.');
  } catch (error) {
    next(error);
  }
};
