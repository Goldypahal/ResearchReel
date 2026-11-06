const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const renderer = require('./videoRenderer');
const storageService = require('./storageService');
const { notify } = require('./notificationService');

const MIN_SECONDS = Number(process.env.REEL_MIN_SECONDS || 3);
const MAX_SECONDS = Number(process.env.REEL_MAX_SECONDS || 180);

/**
 * Background job: transcode an uploaded video to MP4, make a thumbnail, store both,
 * and publish the reel (plus a feed post).
 */
const processVideo = async ({ author_id, title, description, stagingFilePath, linked_paper_id, tags }) => {
  const workDir = await renderer.makeTempDir();
  try {
    if (!(await renderer.ffmpegAvailable())) throw new Error('FFmpeg is not installed on the worker.');
    const duration = await renderer.probeDuration(stagingFilePath);
    if (duration < MIN_SECONDS || duration > MAX_SECONDS) {
      throw new Error(`Videos must be between ${MIN_SECONDS} and ${MAX_SECONDS} seconds (yours is ${Math.round(duration)}s).`);
    }

    const mp4 = path.join(workDir, 'video.mp4');
    const thumbPath = path.join(workDir, 'thumb.jpg');
    await renderer.transcodeToMp4(stagingFilePath, mp4);
    await renderer.extractThumbnail(mp4, thumbPath, Math.min(1, duration / 2));

    const video = await storageService.saveFile({ filePath: mp4, originalName: 'video.mp4', mimeType: 'video/mp4', folder: 'reels' });
    const thumb = await storageService.saveFile({ filePath: thumbPath, originalName: 'thumb.jpg', mimeType: 'image/jpeg', folder: 'reels' });

    const v = await db.query(
      `INSERT INTO videos (author_id, title, description, video_url, thumbnail_url, duration_seconds, linked_paper_id, tags, status, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'published', 'public') RETURNING *`,
      [author_id, title, description || '', video.url, thumb.url, Math.round(duration), linked_paper_id || null, tags || []]
    );
    await db.query(
      `INSERT INTO posts (author_id, content_type, caption, media_urls, document_id, tags, publication_status)
       VALUES ($1, 'video', $2, $3, $4, $5, 'published')`,
      [author_id, `${title}${description ? `\n\n${description}` : ''}`, [video.url], linked_paper_id || null, tags || []]
    );
    await notify({ userId: author_id, actorId: null, type: 'reel_ready', entityType: 'video', entityId: v.rows[0].id, message: `Your reel "${title}" is live.` });
    return v.rows[0];
  } catch (error) {
    await notify({ userId: author_id, actorId: null, type: 'reel_failed', entityType: null, entityId: null, message: `We couldn't process "${title}": ${error.message}` });
    throw error;
  } finally {
    fs.rm(workDir, { recursive: true, force: true }, () => {});
    fs.unlink(stagingFilePath, () => {});
  }
};

module.exports = { processVideo };
