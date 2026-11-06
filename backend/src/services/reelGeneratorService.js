const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const db = require('../config/db');
const { generateReelScript, generateReelSeries } = require('./ai/geminiClient');
const renderer = require('./videoRenderer');
const storageService = require('./storageService');
const { synthesizeToPcm } = require('./ai/tts');
const { notify } = require('./notificationService');
const cryptoHelper = require('../utils/cryptoHelper');

const STYLES = ['indigo-dark', 'slate-gradient', 'emerald-glow', 'crimson-deep', 'violet-pulsar'];

class ReelError extends Error {
  constructor(message, statusCode = 400, code = 'REEL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const getDrafts = async (userId) => {
  const r = await db.query(
    `SELECT rd.*, COALESCE(d.title, d.file_name) AS paper_title
       FROM reel_drafts rd LEFT JOIN documents d ON d.id = rd.linked_paper_id
      WHERE rd.author_id = $1 ORDER BY rd.created_at DESC`,
    [userId]
  );
  return r.rows;
};

const getDraftById = async (id, userId) => {
  const r = await db.query(
    `SELECT rd.*, COALESCE(d.title, d.file_name) AS paper_title
       FROM reel_drafts rd LEFT JOIN documents d ON d.id = rd.linked_paper_id
      WHERE rd.id = $1 AND rd.author_id = $2`,
    [id, userId]
  );
  return r.rows[0] || null;
};

const getUserApiKey = async (userId) => {
  try {
    const r = await db.query('SELECT encrypted_gemini_api_key FROM reel_automation_settings WHERE user_id = $1', [userId]);
    const enc = r.rows[0]?.encrypted_gemini_api_key;
    return enc ? cryptoHelper.decrypt(enc) : null;
  } catch (err) {
    console.error('[Reel] Could not read user API key:', err.message);
    return null;
  }
};

const insertDraft = async ({ userId, documentId, title, description, scenes, partNumber, totalParts }) => {
  const r = await db.query(
    `INSERT INTO reel_drafts (author_id, linked_paper_id, title, description, scenes, status, part_number, total_parts)
     VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7) RETURNING *`,
    [userId, documentId, String(title).slice(0, 200), description, JSON.stringify(scenes), partNumber, totalParts]
  );
  return r.rows[0];
};

/**
 * Creates one draft (single mode) or several (multi-part series) from a paper the user uploaded.
 */
const generateDraftFromPaper = async (documentId, userId, options = {}) => {
  const { split_mode = 'single', parts_mode = 'auto', parts_count = 3 } = options;
  const docRes = await db.query(
    `SELECT id, COALESCE(title, file_name) AS title, abstract, summary_text, key_points, extracted_text
       FROM documents WHERE id = $1 AND uploader_id = $2 AND deleted_at IS NULL`,
    [documentId, userId]
  );
  const doc = docRes.rows[0];
  if (!doc) throw new ReelError('Paper not found. You can only make reels from papers you uploaded.', 404, 'NOT_FOUND');

  const paperTitle = String(doc.title || 'Untitled paper').replace(/\.pdf$/i, '');
  const summary = doc.summary_text || doc.abstract || '';
  if (!summary && !doc.extracted_text) {
    throw new ReelError('This paper has no readable text, so a script cannot be generated. Add an abstract to the paper first.', 422, 'NO_TEXT');
  }
  const apiKey = await getUserApiKey(userId);

  if (split_mode === 'multi') {
    const series = await generateReelSeries(paperTitle, summary, doc.key_points || [], apiKey, { parts_mode, parts_count }, doc.extracted_text);
    const drafts = [];
    for (const part of series) {
      drafts.push(await insertDraft({
        userId, documentId,
        title: part.title || `Part ${part.part_number}: ${paperTitle}`,
        description: part.description || `Part ${part.part_number} of ${part.total_parts} on "${paperTitle}"`,
        scenes: part.scenes, partNumber: part.part_number, totalParts: part.total_parts
      }));
    }
    return drafts;
  }

  const scenes = await generateReelScript(paperTitle, summary, doc.key_points || [], apiKey, doc.extracted_text);
  const title = (options.title && String(options.title).trim()) || paperTitle;
  return insertDraft({ userId, documentId, title, description: `A short explainer of "${paperTitle}".`, scenes, partNumber: 1, totalParts: 1 });
};

const sanitizeScenes = (scenes) => {
  if (!Array.isArray(scenes) || scenes.length === 0) throw new ReelError('A reel needs at least one scene.');
  if (scenes.length > 12) throw new ReelError('A reel can have at most 12 scenes.');
  return scenes.map((s, i) => ({
    title: String(s.title || '').slice(0, 80),
    visualDescription: String(s.visualDescription || '').slice(0, 300),
    dialogue: String(s.dialogue || '').slice(0, 400),
    duration: Math.min(Math.max(parseInt(s.duration, 10) || 8, 3), 20),
    backgroundStyle: STYLES.includes(s.backgroundStyle) ? s.backgroundStyle : STYLES[i % STYLES.length]
  }));
};

const updateDraft = async (id, userId, updates) => {
  const current = await getDraftById(id, userId);
  if (!current) throw new ReelError('Draft not found.', 404, 'NOT_FOUND');
  if (current.status === 'generating') throw new ReelError('This reel is rendering. Wait for it to finish before editing.', 409, 'CONFLICT_ERROR');
  const title = updates.title !== undefined ? String(updates.title).trim().slice(0, 200) : current.title;
  if (!title) throw new ReelError('Title is required.');
  const description = updates.description !== undefined ? String(updates.description).slice(0, 1000) : current.description;
  const scenes = updates.scenes !== undefined ? sanitizeScenes(updates.scenes) : current.scenes;
  const r = await db.query(
    `UPDATE reel_drafts SET title = $1, description = $2, scenes = $3, status = CASE WHEN status = 'failed' THEN 'draft' ELSE status END, updated_at = NOW()
      WHERE id = $4 AND author_id = $5 RETURNING *`,
    [title, description, JSON.stringify(scenes), id, userId]
  );
  return r.rows[0];
};

const deleteDraft = async (id, userId) => {
  const r = await db.query(`DELETE FROM reel_drafts WHERE id = $1 AND author_id = $2 AND status <> 'generating' RETURNING id`, [id, userId]);
  if (!r.rows.length) throw new ReelError('Draft not found or currently rendering.', 404, 'NOT_FOUND');
};

/**
 * Renders a draft into an MP4 reel, publishes it, and posts it to the author's feed.
 * Runs inside the background worker.
 */
const compileVideo = async (draftId) => {
  const draftRes = await db.query('SELECT * FROM reel_drafts WHERE id = $1', [draftId]);
  const draft = draftRes.rows[0];
  if (!draft) return;
  if (!(await renderer.ffmpegAvailable())) {
    await db.query(`UPDATE reel_drafts SET status = 'failed', updated_at = NOW() WHERE id = $1`, [draftId]);
    throw new Error('FFmpeg is not installed on the worker.');
  }

  const scenes = sanitizeScenes(Array.isArray(draft.scenes) ? draft.scenes : JSON.parse(draft.scenes || '[]'));
  const apiKey = await getUserApiKey(draft.author_id);
  const workDir = await renderer.makeTempDir();

  try {
    const clips = [];
    let total = 0;
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      let audio = null;
      let duration = scene.duration;
      const pcm = await synthesizeToPcm(scene.dialogue, path.join(workDir, `tts_${i}.pcm`), apiKey);
      if (pcm) {
        audio = path.join(workDir, `tts_${i}.m4a`);
        await renderer.pcmToAudio(pcm.path, audio, pcm.sampleRate);
        const spoken = await renderer.probeDuration(audio);
        duration = Math.max(duration, Math.ceil(spoken + 0.5));
      }
      clips.push(await renderer.renderScene({ scene, audioPath: audio, durationSeconds: duration, workDir, index: i }));
      total += duration;
    }

    const finalPath = path.join(workDir, 'reel.mp4');
    await renderer.concatClips(clips, finalPath, workDir);
    const thumbPath = path.join(workDir, 'thumb.jpg');
    await renderer.extractThumbnail(finalPath, thumbPath, 1);

    const video = await storageService.saveFile({ filePath: finalPath, originalName: 'reel.mp4', mimeType: 'video/mp4', folder: 'reels' });
    const thumb = await storageService.saveFile({ filePath: thumbPath, originalName: 'thumb.jpg', mimeType: 'image/jpeg', folder: 'reels' });

    let offset = 0;
    const captions = scenes.map((s) => {
      const start = offset; offset += s.duration;
      return { start, end: offset, text: s.dialogue, title: s.title };
    });

    const v = await db.query(
      `INSERT INTO videos (author_id, title, description, video_url, thumbnail_url, duration_seconds, linked_paper_id, tags, timestamps, status, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'published', 'public') RETURNING id`,
      [draft.author_id, draft.title, draft.description, video.url, thumb.url, Math.round(total), draft.linked_paper_id, ['reel'], JSON.stringify(captions)]
    );

    await db.query(`UPDATE reel_drafts SET status = 'completed', video_url = $1, updated_at = NOW() WHERE id = $2`, [video.url, draftId]);
    await db.query(
      `INSERT INTO posts (author_id, content_type, caption, media_urls, document_id, tags, publication_status)
       VALUES ($1, 'video', $2, $3, $4, $5, 'published')`,
      [draft.author_id, `${draft.title}${draft.description ? `\n\n${draft.description}` : ''}`, [video.url], draft.linked_paper_id, ['reel']]
    );
    await notify({ userId: draft.author_id, actorId: null, type: 'reel_ready', entityType: 'video', entityId: v.rows[0].id, message: `Your reel "${draft.title}" is live.` });
    return v.rows[0];
  } catch (error) {
    await db.query(`UPDATE reel_drafts SET status = 'failed', updated_at = NOW() WHERE id = $1`, [draftId]);
    await notify({ userId: draft.author_id, actorId: null, type: 'reel_failed', entityType: 'reel_draft', entityId: draftId, message: `Rendering "${draft.title}" failed. Edit the draft and try again.` });
    throw error;
  } finally {
    fs.rm(workDir, { recursive: true, force: true }, () => {});
  }
};

/** Queues a draft for rendering. */
const publishDraft = async (id, userId) => {
  const draft = await getDraftById(id, userId);
  if (!draft) throw new ReelError('Draft not found.', 404, 'NOT_FOUND');
  if (draft.status === 'generating') throw new ReelError('This reel is already rendering.', 409, 'CONFLICT_ERROR');
  if (draft.status === 'completed') throw new ReelError('This reel has already been published.', 409, 'CONFLICT_ERROR');
  sanitizeScenes(draft.scenes);
  await db.query(`UPDATE reel_drafts SET status = 'generating', updated_at = NOW() WHERE id = $1`, [id]);
  const { addJob, QUEUES } = require('../queues');
  try {
    await addJob(QUEUES.REEL_RENDER, { draftId: id }, { attempts: 1, jobId: `reel-${id}-${Date.now()}` });
  } catch (err) {
    await db.query(`UPDATE reel_drafts SET status = 'draft', updated_at = NOW() WHERE id = $1`, [id]);
    throw new ReelError('Could not queue the reel for rendering. Please try again.', 503, 'QUEUE_UNAVAILABLE');
  }
  return { id, status: 'generating' };
};

const sanitizeSettings = (row) => {
  const copy = { ...row, has_api_key: Boolean(row.encrypted_gemini_api_key) };
  delete copy.encrypted_gemini_api_key;
  return copy;
};

const ensureSettings = async (userId) => {
  await db.query(
    `INSERT INTO reel_automation_settings (user_id, auto_generate, auto_upload, upload_interval_hours, next_upload_at)
     VALUES ($1, FALSE, FALSE, 24, NULL) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
  const r = await db.query('SELECT * FROM reel_automation_settings WHERE user_id = $1', [userId]);
  return r.rows[0];
};

const getAutomationSettings = async (userId) => sanitizeSettings(await ensureSettings(userId));

const updateAutomationSettings = async (userId, settings) => {
  const current = await ensureSettings(userId);
  const autoGenerate = settings.auto_generate !== undefined ? Boolean(settings.auto_generate) : current.auto_generate;
  const autoUpload = settings.auto_upload !== undefined ? Boolean(settings.auto_upload) : current.auto_upload;
  let interval = settings.upload_interval_hours !== undefined ? parseInt(settings.upload_interval_hours, 10) : current.upload_interval_hours;
  if (!Number.isFinite(interval) || interval < 1 || interval > 24 * 30) interval = 24;

  let encryptedKey = current.encrypted_gemini_api_key;
  if (settings.gemini_api_key !== undefined) {
    const k = String(settings.gemini_api_key || '').trim();
    encryptedKey = k ? cryptoHelper.encrypt(k) : null;
  }
  const nextUpload = autoUpload ? new Date(Date.now() + interval * 3600 * 1000) : null;

  const r = await db.query(
    `UPDATE reel_automation_settings
        SET auto_generate = $1, auto_upload = $2, upload_interval_hours = $3, next_upload_at = $4,
            encrypted_gemini_api_key = $5, updated_at = NOW()
      WHERE user_id = $6 RETURNING *`,
    [autoGenerate, autoUpload, interval, nextUpload, encryptedKey, userId]
  );
  return sanitizeSettings(r.rows[0]);
};

/** Called after a paper upload: auto-generate (and optionally queue) a reel if the user enabled it. */
const handleNewPaperUpload = async (documentId, userId) => {
  try {
    const settings = await getAutomationSettings(userId);
    if (!settings.auto_generate) return;
    const draft = await generateDraftFromPaper(documentId, userId);
    if (settings.auto_upload && draft?.id) await publishDraft(draft.id, userId);
  } catch (error) {
    console.error('[Reel] Auto-generation for new paper failed:', error.message);
  }
};

const getUserDocuments = async (userId) => {
  const r = await db.query(
    `SELECT id, COALESCE(title, file_name) AS title, file_name, file_url, abstract, created_at
       FROM documents WHERE uploader_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
    [userId]
  );
  return r.rows;
};

module.exports = {
  ReelError,
  getDrafts,
  getDraftById,
  generateDraftFromPaper,
  updateDraft,
  deleteDraft,
  compileVideo,
  publishDraft,
  getAutomationSettings,
  updateAutomationSettings,
  handleNewPaperUpload,
  getUserDocuments
};
