const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const db = require('../config/db');
const { AppError } = require('../utils/errors');
const searchService = require('./searchService');

// Ensure directories exist
const stagingDir = path.join(__dirname, '../../public/uploads/staging');
const processedDir = path.join(__dirname, '../../public/uploads/processed');

if (!fs.existsSync(stagingDir)) {
  fs.mkdirSync(stagingDir, { recursive: true });
}
if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}

/**
 * Checks if FFmpeg and FFprobe are available on the system
 */
const checkFFmpegAvailable = () => {
  return new Promise((resolve) => {
    exec('ffmpeg -version', (err) => {
      if (err) resolve(false);
      else {
        exec('ffprobe -version', (err2) => {
          resolve(!err2);
        });
      }
    });
  });
};

/**
 * Reads the video duration with FFprobe.
 */
const getVideoDuration = async (filePath) => {
  const hasFFmpeg = await checkFFmpegAvailable();
  if (!hasFFmpeg) {
    throw new AppError('Video processing is unavailable on this server (FFmpeg is not installed).', 503, 'MEDIA_UNAVAILABLE');
  }

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration;
      resolve(duration);
    });
  });
};

/**
 * Process video: transcode, generate HLS, extract thumbnail, generate captions, insert into DB
 */
const processVideo = async ({
  author_id,
  title,
  description,
  stagingFilePath,
  filename,
  linked_paper_id,
  tags,
  timestamps
}) => {
  const hasFFmpeg = await checkFFmpegAvailable();
  const videoId = 'vid_' + Date.now();
  const outputSubDir = path.join(processedDir, videoId);
  fs.mkdirSync(outputSubDir, { recursive: true });

  const finalVideoName = `${videoId}.mp4`;
  const hlsManifestName = `${videoId}.m3u8`;
  const thumbnailName = `${videoId}_thumb.jpg`;
  
  const localVideoPath = path.join(outputSubDir, finalVideoName);
  const localHlsPath = path.join(outputSubDir, hlsManifestName);
  const localThumbPath = path.join(outputSubDir, thumbnailName);

  const videoUrl = `/uploads/processed/${videoId}/${finalVideoName}`;
  const hlsUrl = `/uploads/processed/${videoId}/${hlsManifestName}`;
  const thumbnailUrl = `/uploads/processed/${videoId}/${thumbnailName}`;

  try {
    if (!hasFFmpeg) {
      throw new AppError('Video processing is unavailable on this server (FFmpeg is not installed).', 503, 'MEDIA_UNAVAILABLE');
    }
    // 1. Get and validate duration
    let durationSeconds;
    try {
      durationSeconds = Math.round(await getVideoDuration(stagingFilePath));
    } catch (e) {
      throw new AppError('This file could not be read as a video.', 400, 'INVALID_VIDEO');
    }
    if (!Number.isFinite(durationSeconds) || durationSeconds < 30 || durationSeconds > 60) {
      throw new AppError(`Reels must be 30–60 seconds long; this video is ${durationSeconds}s.`, 400, 'INVALID_DURATION');
    }

    // 2. Transcode / Thumbnail Generation
    {
      console.log(`Processing video with FFmpeg for ${videoId}...`);
      
      // Extract Thumbnail at 1s mark
      await new Promise((resolve, reject) => {
        ffmpeg(stagingFilePath)
          .screenshots({
            timestamps: [1],
            filename: thumbnailName,
            folder: outputSubDir,
            size: '360x640'
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // Transcode to multi-resolution HLS
      await new Promise((resolve, reject) => {
        ffmpeg(stagingFilePath)
          .output(localHlsPath)
          .addOption('-profile:v', 'baseline')
          .addOption('-level', '3.0')
          .addOption('-start_number', '0')
          .addOption('-hls_time', '10')
          .addOption('-hls_list_size', '0')
          .addOption('-f', 'hls')
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      // Also copy original or copy to output folder for direct download
      fs.copyFileSync(stagingFilePath, localVideoPath);

    }

    // 4. Save to Database (Section 8.1.3 videos table)
    // Make sure duration_seconds is valid (check constraint: between 30 and 60)
    const dbDuration = durationSeconds;
    const cleanTags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []);

    const newReel = await db.query(
      `INSERT INTO videos (author_id, title, description, video_url, thumbnail_url, duration_seconds, linked_paper_id, timestamps, tags, hls_playlist_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        author_id,
        title,
        description,
        videoUrl,
        thumbnailUrl,
        dbDuration,
        linked_paper_id || null,
        JSON.stringify(timestamps || []),
        cleanTags,
        hlsUrl
      ]
    );

    const videoRecord = newReel.rows[0];

    // 5. Index in search engine
    try {
      await searchService.indexEntity('videos', videoRecord.id, {
        id: videoRecord.id,
        title: videoRecord.title,
        description: videoRecord.description,
        author_id: videoRecord.author_id,
        tags: videoRecord.tags,
        created_at: videoRecord.created_at
      });
    } catch (err) {
      console.error('Failed to index video in search:', err.message);
    }

    // Cleanup staging file
    if (fs.existsSync(stagingFilePath)) {
      fs.unlinkSync(stagingFilePath);
    }

    console.log(`Video processing completed successfully for ${videoId}`);
    return videoRecord;

  } catch (error) {
    console.error(`Error in video processing pipeline for ${videoId}:`, error);
    
    // Cleanup files if they exist
    if (fs.existsSync(stagingFilePath)) fs.unlinkSync(stagingFilePath);
    if (fs.existsSync(outputSubDir)) {
      fs.rmSync(outputSubDir, { recursive: true, force: true });
    }
    throw error;
  }
};

module.exports = {
  getVideoDuration,
  processVideo
};
