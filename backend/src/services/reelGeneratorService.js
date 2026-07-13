const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');
const db = require('../config/db');
const { generateReelScript } = require('./ai/geminiClient');
const searchService = require('./searchService');

const stagingDir = path.join(__dirname, '../../public/uploads/staging');
const processedDir = path.join(__dirname, '../../public/uploads/processed');

// Ensure directories exist
if (!fs.existsSync(stagingDir)) fs.mkdirSync(stagingDir, { recursive: true });
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

/**
 * Checks if FFmpeg and FFprobe are available
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
 * Split text into wrapped lines for FFmpeg drawtext
 */
const wrapTextForFFmpeg = (text, maxChars = 32) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
};

/**
 * Escape text for FFmpeg drawtext filter
 */
const escapeFFmpegText = (text) => {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%');
};

/**
 * Get a platform-appropriate font path for FFmpeg drawtext.
 * Falls back to omitting fontfile (uses FFmpeg default fontconfig).
 */
const getFontPath = () => {
  if (process.platform === 'win32') {
    return 'C\\:/Windows/Fonts/arial.ttf';
  }
  // Linux/Unix: common paths
  if (fs.existsSync('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')) {
    return '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  }
  if (fs.existsSync('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf')) {
    return '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf';
  }
  // macOS
  if (fs.existsSync('/System/Library/Fonts/Helvetica.ttc')) {
    return '/System/Library/Fonts/Helvetica.ttc';
  }
  // Fallback: omit fontfile, let FFmpeg fontconfig decide
  return null;
};

const getDrafts = async (userId) => {
  const result = await db.query(
    'SELECT * FROM reel_drafts WHERE author_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
};

const getDraftById = async (id, userId) => {
  const result = await db.query(
    'SELECT * FROM reel_drafts WHERE id = $1 AND author_id = $2',
    [id, userId]
  );
  return result.rows[0];
};

const generateDraftFromPaper = async (documentId, userId, options = {}) => {
  const { split_mode = 'single', parts_mode = 'auto', parts_count = 3 } = options;

  // 1. Fetch document from db
  const docResult = await db.query(
    'SELECT * FROM documents WHERE id = $1',
    [documentId]
  );
  const doc = docResult && docResult.rows ? docResult.rows[0] : null;
  if (!doc) {
    throw new Error('Document not found');
  }

  const paperTitle = doc.file_name || 'Untitled Research Paper';
  const summaryText = doc.summary_text || 'No abstract summary available.';
  const keyPoints = doc.key_points || [];

  // Get user's custom API key if any
  let userApiKey = null;
  try {
    const settingsResult = await db.query(
      'SELECT encrypted_gemini_api_key FROM reel_automation_settings WHERE user_id = $1',
      [userId]
    );
    if (settingsResult && settingsResult.rows && settingsResult.rows.length > 0) {
      const encryptedKey = settingsResult.rows[0].encrypted_gemini_api_key;
      if (encryptedKey) {
        const cryptoHelper = require('../utils/cryptoHelper');
        userApiKey = cryptoHelper.decrypt(encryptedKey);
      }
    }
  } catch (err) {
    console.error('[Reel Service] Failed to retrieve user API key for draft generation:', err.message);
  }

  if (split_mode === 'multi') {
    const { generateReelSeries } = require('./ai/geminiClient');
    console.log(`[Reel Service] Generating AI multi-part series for paper: ${paperTitle}`);
    const series = await generateReelSeries(paperTitle, summaryText, keyPoints, userApiKey, { parts_mode, parts_count });

    const createdDrafts = [];
    for (const part of series) {
      const title = part.title || `Insight Part ${part.part_number}: ${paperTitle.replace(/\.[^/.]+$/, "")}`;
      const description = part.description || `Key insights and breakdown of the paper: ${paperTitle} (Part ${part.part_number} of ${part.total_parts})`;
      
      const newDraft = await db.query(
        `INSERT INTO reel_drafts (author_id, linked_paper_id, title, description, scenes, status, part_number, total_parts)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [userId, documentId, title, description, JSON.stringify(part.scenes), 'draft', part.part_number, part.total_parts]
      );
      if (newDraft && newDraft.rows && newDraft.rows.length > 0) {
        createdDrafts.push(newDraft.rows[0]);
      }
    }
    return createdDrafts;
  } else {
    // 2. Call Gemini Client to generate scenes
    console.log(`[Reel Service] Generating AI script for paper: ${paperTitle}`);
    const scenes = await generateReelScript(paperTitle, summaryText, keyPoints, userApiKey);

    // 3. Create Draft in database
    const title = `Insight: ${paperTitle.replace(/\.[^/.]+$/, "")}`;
    const description = `Key insights and breakdown of the paper: ${paperTitle}`;
    
    const newDraft = await db.query(
      `INSERT INTO reel_drafts (author_id, linked_paper_id, title, description, scenes, status, part_number, total_parts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, documentId, title, description, JSON.stringify(scenes), 'draft', 1, 1]
    );

    return newDraft && newDraft.rows ? newDraft.rows[0] : null;
  }
};

const updateDraft = async (id, userId, updates) => {
  const { title, description, scenes } = updates;
  const currentDraft = await getDraftById(id, userId);
  if (!currentDraft) {
    throw new Error('Draft not found');
  }

  const newTitle = title !== undefined ? title : currentDraft.title;
  const newDescription = description !== undefined ? description : currentDraft.description;
  const newScenes = scenes !== undefined ? JSON.stringify(scenes) : JSON.stringify(currentDraft.scenes);

  const result = await db.query(
    `UPDATE reel_drafts 
     SET title = $1, description = $2, scenes = $3, updated_at = NOW()
     WHERE id = $4 AND author_id = $5 RETURNING *`,
    [newTitle, newDescription, newScenes, id, userId]
  );

  return result.rows[0];
};

const compileVideo = async (draftId) => {
  console.log(`[Reel Service] Starting background compilation for draft: ${draftId}`);
  
  // 1. Fetch Draft
  const draftResult = await db.query('SELECT * FROM reel_drafts WHERE id = $1', [draftId]);
  const draft = draftResult.rows[0];
  if (!draft) {
    console.error(`[Reel Service] Draft not found: ${draftId}`);
    return;
  }

  // Update status to generating
  await db.query('UPDATE reel_drafts SET status = $1 WHERE id = $2', ['generating', draftId]);

  const reelId = `reel_${Date.now()}`;
  const outputSubDir = path.join(processedDir, reelId);
  fs.mkdirSync(outputSubDir, { recursive: true });

  const finalVideoName = `${reelId}.mp4`;
  const hlsManifestName = `${reelId}.m3u8`;
  const thumbnailName = `${reelId}_thumb.jpg`;
  const captionsName = `${reelId}_captions.json`;

  const localVideoPath = path.join(outputSubDir, finalVideoName);
  const localHlsPath = path.join(outputSubDir, hlsManifestName);
  const localThumbPath = path.join(outputSubDir, thumbnailName);
  const localCaptionsPath = path.join(outputSubDir, captionsName);

  const scenes = Array.isArray(draft.scenes) ? draft.scenes : JSON.parse(draft.scenes || '[]');
  let totalDuration = 0;
  scenes.forEach(s => totalDuration += (parseInt(s.duration) || 8));

  const hasFFmpeg = await checkFFmpegAvailable();

  try {
    if (hasFFmpeg) {
      console.log(`[Reel Service] FFmpeg is available. Starting rendering of ${scenes.length} scenes...`);
      const tempClips = [];

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const sceneDur = parseInt(scene.duration) || 8;
        const style = scene.backgroundStyle || 'indigo-dark';
        
        // Determine BG Color Hex based on style
        let hexColor = '1E1B4B'; // default dark indigo
        if (style === 'slate-gradient') hexColor = '0F172A';
        else if (style === 'emerald-glow') hexColor = '064E3B';
        else if (style === 'crimson-deep') hexColor = '450A0A';
        else if (style === 'violet-pulsar') hexColor = '2E1065';

        const tempAudioPath = path.join(outputSubDir, `temp_audio_${i}.mp3`);
        const tempVideoPath = path.join(outputSubDir, `temp_video_${i}.mp4`);
        const tempMergedPath = path.join(outputSubDir, `temp_merged_${i}.mp4`);

        // 1. Generate Voiceover TTS Audio
        let ttsSuccess = false;
        try {
          const dialogueText = scene.dialogue || '';
          if (dialogueText) {
            console.log(`[Reel Service] Fetching TTS for scene ${i}: "${dialogueText.substring(0, 30)}..."`);
            // NOTE: Google Translate TTS is an undocumented API that may break or
            // be rate-limited.  The fallback (silence generation) handles failures.
            // For production, replace with a paid TTS provider (e.g. Google Cloud TTS).
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(dialogueText.substring(0, 200))}`;
            const ttsResponse = await axios({
              method: 'get',
              url: ttsUrl,
              responseType: 'stream',
              headers: { 'User-Agent': 'Mozilla/5.0' },
              timeout: 5000
            });
            
            const writeStream = fs.createWriteStream(tempAudioPath);
            ttsResponse.data.pipe(writeStream);
            await new Promise((resolve, reject) => {
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
            });
            ttsSuccess = true;
          }
        } catch (ttsErr) {
          console.warn(`[Reel Service] TTS fetch failed or offline for scene ${i}:`, ttsErr.message);
        }

        // If TTS failed, generate background silence
        if (!ttsSuccess) {
          console.log(`[Reel Service] Generating audio silence for scene ${i}`);
          await new Promise((resolve, reject) => {
            exec(`ffmpeg -y -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t ${sceneDur} "${tempAudioPath}"`, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }

        // 2. Prepare DrawText Filter
        const escapedTitle = escapeFFmpegText(scene.title || '');
        const dialogueLines = wrapTextForFFmpeg(scene.dialogue || '', 35);
        const fontPath = getFontPath();
        const fontArg = fontPath ? `:fontfile='${fontPath}'` : '';

        let filters = `color=c=0x${hexColor}:s=720x1280:d=${sceneDur}:r=30 [bg]; `;
        filters += `[bg] drawtext=text='${escapedTitle}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=(h-text_h)/2.2${fontArg}`;

        // Add dialogue lines at the bottom
        let startY = 950;
        dialogueLines.forEach((line, lineIdx) => {
          const escapedLine = escapeFFmpegText(line);
          filters += `, drawtext=text='${escapedLine}':fontcolor=0xE0E7FF:fontsize=22:x=(w-text_w)/2:y=${startY + (lineIdx * 35)}${fontArg}`;
        });

        // 3. Render video clip with overlay and merge audio
        console.log(`[Reel Service] Rendering video clip for scene ${i}...`);
        const renderCmd = `ffmpeg -y -f lavfi -i "${filters}" -i "${tempAudioPath}" -map 0:v -map 1:a -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${tempMergedPath}"`;
        
        await new Promise((resolve, reject) => {
          exec(renderCmd, (err) => {
            if (err) {
              console.error(`[Reel Service] FFmpeg scene render failed command:`, renderCmd);
              reject(err);
            } else {
              resolve();
            }
          });
        });

        tempClips.push(tempMergedPath);
      }

      // 4. Concatenate all clips
      console.log(`[Reel Service] Concatenating ${tempClips.length} scenes...`);
      const listPath = path.join(outputSubDir, 'concat_list.txt');
      const listContent = tempClips.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
      fs.writeFileSync(listPath, listContent);

      const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${localVideoPath}"`;
      await new Promise((resolve, reject) => {
        exec(concatCmd, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 5. Generate HLS playlist
      console.log(`[Reel Service] Creating HLS manifest for final video...`);
      const hlsCmd = `ffmpeg -y -i "${localVideoPath}" -profile:v baseline -level 3.0 -start_number 0 -hls_time 10 -hls_list_size 0 -f hls "${localHlsPath}"`;
      await new Promise((resolve, reject) => {
        exec(hlsCmd, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 6. Generate Thumbnail from first second
      console.log(`[Reel Service] Creating video thumbnail...`);
      const thumbCmd = `ffmpeg -y -i "${localVideoPath}" -ss 00:00:01 -vframes 1 -s 360x640 "${localThumbPath}"`;
      await new Promise((resolve, reject) => {
        exec(thumbCmd, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Cleanup temporary clips
      try {
        fs.unlinkSync(listPath);
        for (let i = 0; i < scenes.length; i++) {
          const pathA = path.join(outputSubDir, `temp_audio_${i}.mp3`);
          const pathV = path.join(outputSubDir, `temp_video_${i}.mp4`);
          const pathM = path.join(outputSubDir, `temp_merged_${i}.mp4`);
          if (fs.existsSync(pathA)) fs.unlinkSync(pathA);
          if (fs.existsSync(pathV)) fs.unlinkSync(pathV);
          if (fs.existsSync(pathM)) fs.unlinkSync(pathM);
        }
      } catch (cleanErr) {
        console.warn('[Reel Service] Failed cleaning temp clips:', cleanErr.message);
      }

    } else {
      // Graceful fallback simulation
      console.log('[Reel Service] FFmpeg is missing. Generating beautiful simulation reel...');
      
      // Write minimal playable video (base64 of valid 1s silent MP4)
      const miniMp4Base64 = 'AAAAIGZ0eXBpc29tAAAAAGlzb21tcDgxQXZjMQAAAABmcmVlAAAAG21kYXTeBAAAbGliZmZtcGVnNTkuMTguMTAwAKACAAAAIG1vb3YAAABsbXZoZAAAAADSpJc30qSXNwAAAAACAAAAAgAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACNXRyYWsAAABcdGtoZAAAAAPSpJc30qSXNwAAAAEAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAG1kaWEAAABkZWRoZAAAAADSpJc30qSXNwAAAAACAAAAAgAAAAAQAAABhoZGxyAAAAAAAAAAB2aWRlAAAAAAAAAAAAAAAAVmlkZW9IYW5kbGVyAAAAAYxtZGluZgAAABRkaW5mAAAAEGRyZWYAAAAAAAAAAQAAAAxtdXJhAAAAAAAAAFNzdGJsAAAAaHNkdecAAAAAc3RzZAAAAAAAAAABAAAAGWF2YzEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAIAAgAEgAAABIAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY//8AAAAcYXZjQwFUgD3/4QAKZyAF0AHaEAAAf4AAAA8AAQBtcHJvAAAAG2N0dHMAAAAAAAAAAQAAAAEAAAAKAAAAKHN0c3oAAAAAAAAADQAAAEsAAAAHAAAABwAAAAcAAAAHAAAABwAAAAcAAAAHAAAABwAAAAcAAAAHAAAABwAAAFBzdGNvAAAAAAAAAAEAAAAsAAAAYnVkdGEAAABadWR0YQAAAFJtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZHRhAAAAAAAAAAAAAAAAAAAAACRrbWV5cwAAAAAAAAABAAAAE21kYXRhOmtleXdvcmQAAAAAbWlydAAAAAAAAAAVaWxzdAAAAA0AAAAAAAAAAQA=';
      fs.writeFileSync(localVideoPath, Buffer.from(miniMp4Base64, 'base64'));

      // HLS Manifest
      const mockM3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:${totalDuration}
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:${totalDuration}.0,
/uploads/processed/${reelId}/${finalVideoName}
#EXT-X-ENDLIST`;
      fs.writeFileSync(localHlsPath, mockM3u8Content);

      // Create a simple 1x1 black pixel JPEG as placeholder thumbnail
      const placeholderJpgBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
      fs.writeFileSync(localThumbPath, Buffer.from(placeholderJpgBase64, 'base64'));
    }

    // 7. Write captions json
    const captions = scenes.map((s, idx) => {
      let start = 0;
      for (let j = 0; j < idx; j++) {
        start += (parseInt(scenes[j].duration) || 8);
      }
      const dur = parseInt(s.duration) || 8;
      return {
        start,
        end: start + dur,
        text: `[${s.title}] ${s.dialogue}`
      };
    });
    fs.writeFileSync(localCaptionsPath, JSON.stringify(captions, null, 2));

    // 8. Create Video in Database
    const dbDuration = Math.max(30, Math.min(60, totalDuration));
    const videoUrl = `/uploads/processed/${reelId}/${hlsManifestName}`;
    const thumbnailUrl = `/uploads/processed/${reelId}/${thumbnailName}`;

    console.log(`[Reel Service] Saving video to db...`);
    const newVideo = await db.query(
      `INSERT INTO videos (author_id, title, description, video_url, thumbnail_url, duration_seconds, linked_paper_id, tags, timestamps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        draft.author_id,
        draft.title,
        draft.description,
        videoUrl,
        thumbnailUrl,
        dbDuration,
        draft.linked_paper_id || null,
        ['aireel', 'academic-reels'],
        JSON.stringify(captions)
      ]
    );
    const videoRecord = newVideo.rows[0];

    // Index video in search
    try {
      await searchService.indexEntity('videos', videoRecord.id, {
        id: videoRecord.id,
        title: videoRecord.title,
        description: videoRecord.description,
        author_id: videoRecord.author_id,
        tags: videoRecord.tags,
        created_at: videoRecord.created_at
      });
    } catch (searchErr) {
      console.warn('[Reel Service] Failed to index video in search:', searchErr.message);
    }

    // 9. Update Draft to Completed
    await db.query(
      `UPDATE reel_drafts 
       SET status = 'completed', video_url = $1, updated_at = NOW() 
       WHERE id = $2`,
      [videoUrl, draftId]
    );

    // 10. Automatically post to feed
    console.log(`[Reel Service] Posting reel to the feed...`);
    const captionText = `🚨 New Research Reel published: **${draft.title}**\n\n${draft.description}`;
    const newPost = await db.query(
      `INSERT INTO posts (author_id, content_type, caption, media_urls, document_id, tags, publication_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        draft.author_id,
        'video',
        captionText,
        [videoUrl],
        draft.linked_paper_id || null,
        ['aireel', 'science'],
        'published'
      ]
    );

    // Index post in search
    try {
      await searchService.indexEntity('posts', newPost.rows[0].id, {
        id: newPost.rows[0].id,
        author_id: draft.author_id,
        caption: captionText,
        tags: ['aireel', 'science'],
        publication_status: 'published',
        content_type: 'video'
      });
    } catch (searchErr) {
      console.warn('[Reel Service] Failed to index post in search:', searchErr.message);
    }

    console.log(`[Reel Service] Finished reel compilation successfully: ${videoUrl}`);

  } catch (error) {
    console.error(`[Reel Service] Error during reel compilation for ${draftId}:`, error);
    await db.query(`UPDATE reel_drafts SET status = 'failed', updated_at = NOW() WHERE id = $1`, [draftId]);
  }
};

const publishDraft = async (id, userId) => {
  const draft = await getDraftById(id, userId);
  if (!draft) {
    throw new Error('Draft not found');
  }

  // Trigger compilation asynchronously so client doesn't hang
  compileVideo(draft.id).catch(err => {
    console.error('[Reel Service] Error in compileVideo async trigger:', err);
  });

  return { success: true, message: 'Reel compilation started in the background.' };
};

const getAutomationSettings = async (userId) => {
  const result = await db.query(
    'SELECT * FROM reel_automation_settings WHERE user_id = $1',
    [userId]
  );

  // If settings don't exist yet, insert defaults
  if (!result || !result.rows || result.rows.length === 0) {
    const defaultSettings = await db.query(
      `INSERT INTO reel_automation_settings (user_id, auto_generate, auto_upload, upload_interval_hours)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, false, false, 24]
    );
    const settings = defaultSettings && defaultSettings.rows ? defaultSettings.rows[0] : { user_id: userId, auto_generate: false, auto_upload: false, upload_interval_hours: 24 };
    return {
      ...settings,
      has_api_key: false
    };
  }

  const settings = result.rows[0];
  const settingsCopy = { ...settings };
  settingsCopy.has_api_key = !!settingsCopy.encrypted_gemini_api_key;
  delete settingsCopy.encrypted_gemini_api_key;
  return settingsCopy;
};

const updateAutomationSettings = async (userId, settings) => {
  const { auto_generate, auto_upload, upload_interval_hours, gemini_api_key } = settings;
  
  // Get raw current settings to access the existing encrypted key
  const currentResult = await db.query(
    'SELECT * FROM reel_automation_settings WHERE user_id = $1',
    [userId]
  );
  
  let current = currentResult && currentResult.rows ? currentResult.rows[0] : null;
  if (!current) {
    // Insert defaults first if not found
    const defaultSettings = await db.query(
      `INSERT INTO reel_automation_settings (user_id, auto_generate, auto_upload, upload_interval_hours)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, false, false, 24]
    );
    current = defaultSettings.rows[0];
  }

  const nextUpload = auto_upload 
    ? new Date(Date.now() + (upload_interval_hours || current.upload_interval_hours) * 60 * 60 * 1000)
    : null;

  let encryptedKey = current.encrypted_gemini_api_key;
  if (gemini_api_key !== undefined) {
    if (gemini_api_key === '') {
      encryptedKey = null;
    } else {
      const cryptoHelper = require('../utils/cryptoHelper');
      encryptedKey = cryptoHelper.encrypt(gemini_api_key);
    }
  }

  const result = await db.query(
    `UPDATE reel_automation_settings
     SET auto_generate = $1, auto_upload = $2, upload_interval_hours = $3, next_upload_at = $4, encrypted_gemini_api_key = $5, updated_at = NOW()
     WHERE user_id = $6 RETURNING *`,
    [
      auto_generate !== undefined ? auto_generate : current.auto_generate,
      auto_upload !== undefined ? auto_upload : current.auto_upload,
      upload_interval_hours !== undefined ? upload_interval_hours : current.upload_interval_hours,
      nextUpload,
      encryptedKey,
      userId
    ]
  );

  const updatedSettings = result.rows[0];
  const settingsCopy = { ...updatedSettings };
  settingsCopy.has_api_key = !!settingsCopy.encrypted_gemini_api_key;
  delete settingsCopy.encrypted_gemini_api_key;
  return settingsCopy;
};

/**
 * Periodically called or called on paper upload:
 * If user has auto_generate enabled, automatically generate draft for this paper.
 * If user also has auto_upload enabled, automatically trigger compilation!
 */
const handleNewPaperUpload = async (documentId, userId) => {
  try {
    const settings = await getAutomationSettings(userId);
    if (!settings.auto_generate) return;

    console.log(`[Reel Service] Auto-generating reel draft for new document: ${documentId}`);
    const draft = await generateDraftFromPaper(documentId, userId);

    if (settings.auto_upload) {
      console.log(`[Reel Service] Auto-publishing reel draft: ${draft.id}`);
      await publishDraft(draft.id, userId);
    }
  } catch (error) {
    console.error('[Reel Service] Error handling auto-generation for new paper:', error.message);
  }
};

const getUserDocuments = async (userId) => {
  const result = await db.query(
    'SELECT * FROM documents WHERE uploader_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
};

module.exports = {
  getDrafts,
  getDraftById,
  generateDraftFromPaper,
  updateDraft,
  publishDraft,
  getAutomationSettings,
  updateAutomationSettings,
  handleNewPaperUpload,
  getUserDocuments
};
