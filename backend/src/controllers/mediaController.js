const mediaService = require('../services/mediaService');
const { addVideoJob, videoQueue } = require('../queues/videoQueue');
const { sendSuccess, sendError } = require('../utils/response');
const fs = require('fs');

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file provided' });
    }

    const { title, description, linked_paper_id, tags, timestamps } = req.body;
    if (!title) {
      // Clean up uploaded staging file
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const { moderateText } = require('../utils/moderator');
    const titleMod = moderateText(title);
    const descMod = moderateText(description);
    if (!titleMod.clean || !descMod.clean) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      const violator = !titleMod.clean ? titleMod.matchedKeyword : descMod.matchedKeyword;
      return res.status(400).json({
        success: false,
        message: `Content violates community guidelines (detected prohibited keyword: "${violator}").`
      });
    }

    // Validate video duration before adding to task queue
    const duration = await mediaService.getVideoDuration(req.file.path);
    if (duration < 30 || duration > 60) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: `Video duration of ${Math.round(duration)}s is invalid. Video must be between 30 and 60 seconds.` 
      });
    }

    // Parse tags and timestamps
    let parsedTags = [];
    if (tags) {
      if (typeof tags === 'string') {
        parsedTags = tags.split(',').map(t => t.trim());
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    }

    let parsedTimestamps = [];
    if (timestamps) {
      try {
        parsedTimestamps = typeof timestamps === 'string' ? JSON.parse(timestamps) : timestamps;
      } catch (e) {
        console.warn('Failed to parse timestamps JSON, using empty array');
      }
    }

    const job = await addVideoJob({
      author_id: req.user.id,
      title,
      description: description || '',
      stagingFilePath: req.file.path,
      filename: req.file.filename,
      linked_paper_id,
      tags: parsedTags,
      timestamps: parsedTimestamps
    });

    res.status(202).json({ 
      success: true, 
      message: 'Video uploaded successfully. Transcoding and indexing started in the background.', 
      jobId: job.id
    });
  } catch (error) {
    console.error('Video upload controller error:', error);
    // Ensure file is deleted if processing failed
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ success: false, message: error.message || 'Video processing failed' });
  }
};

/** Status of one of the viewer's own video uploads. */
exports.getJob = async (req, res, next) => {
  try {
    const job = await videoQueue.getJob(String(req.params.id));
    if (!job || job.data.author_id !== req.user.id) return sendError(res, 'Upload not found.', 404, 'NOT_FOUND', req);
    const state = await job.getState();
    const value = job.returnvalue || null;
    return sendSuccess(res, {
      id: job.id,
      state, // waiting | active | completed | failed | delayed
      title: job.data.title,
      error: state === 'failed' ? String(job.failedReason || 'Processing failed').slice(0, 300) : null,
      video_id: value && value.id ? value.id : null,
    }, 'Upload status.');
  } catch (error) {
    next(error);
  }
};

exports.healthCheck = (req, res) => {
  res.status(200).json({ success: true, message: 'Media service ready' });
};
