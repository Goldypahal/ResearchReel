const fs = require('fs');
const db = require('../config/db');
const { addJob, QUEUES } = require('../queues');
const { moderateText } = require('../utils/moderator');
const { sendSuccess, sendError } = require('../utils/response');
const { isUuid } = require('../utils/pagination');

const discard = (req) => { if (req.file?.path) fs.unlink(req.file.path, () => {}); };

exports.uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'Choose a video to upload.', 400, 'VALIDATION_ERROR', req);

    const title = String(req.body.title || '').trim().slice(0, 200);
    const description = String(req.body.description || '').trim().slice(0, 2000);
    if (!title) { discard(req); return sendError(res, 'Give your reel a title.', 400, 'VALIDATION_ERROR', req); }

    for (const text of [title, description]) {
      const mod = moderateText(text);
      if (!mod.clean) { discard(req); return sendError(res, 'Your reel was blocked by our spam filter.', 400, 'CONTENT_REJECTED', req); }
    }

    let linkedPaperId = req.body.linked_paper_id || null;
    if (linkedPaperId) {
      if (!isUuid(linkedPaperId)) linkedPaperId = null;
      else {
        const doc = await db.query(`SELECT 1 FROM documents WHERE id = $1 AND deleted_at IS NULL AND (visibility = 'public' OR uploader_id = $2)`, [linkedPaperId, req.user.id]);
        if (!doc.rows.length) linkedPaperId = null;
      }
    }

    const tags = String(req.body.tags || '').split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean).slice(0, 20);

    const job = await addJob(QUEUES.MEDIA, {
      author_id: req.user.id,
      title,
      description,
      stagingFilePath: req.file.path,
      linked_paper_id: linkedPaperId,
      tags
    }, { attempts: 1 });

    return sendSuccess(res, { jobId: job.id }, 'Upload received. Your reel will appear once processing finishes.', 202);
  } catch (error) {
    discard(req);
    next(error);
  }
};
