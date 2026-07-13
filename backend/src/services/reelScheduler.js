const db = require('../config/db');
const reelGeneratorService = require('./reelGeneratorService');

let schedulerInterval = null;

/**
 * Checks for users with pending auto-uploads and processes them.
 */
const checkAndProcessAutoUploads = async () => {
  console.log('[Reel Scheduler] Running checks for scheduled auto-uploads...');
  try {
    // 1. Get users whose next_upload_at time has arrived/passed and auto_upload is enabled
    const pendingResult = await db.query(
      `SELECT * FROM reel_automation_settings 
       WHERE auto_upload = true AND next_upload_at <= NOW()`
    );

    const pendingSettings = pendingResult.rows;
    if (pendingSettings.length === 0) {
      return;
    }

    console.log(`[Reel Scheduler] Found ${pendingSettings.length} user(s) with pending auto-uploads.`);

    for (const setting of pendingSettings) {
      const { user_id, upload_interval_hours } = setting;
      console.log(`[Reel Scheduler] Processing auto-upload for user: ${user_id}`);

      try {
        // Find if there's any pending draft (status = 'draft') for this user
        const draftResult = await db.query(
          `SELECT * FROM reel_drafts 
           WHERE author_id = $1 AND status = 'draft' 
           ORDER BY created_at ASC LIMIT 1`,
          [user_id]
        );

        let draft = draftResult.rows[0];

        // If no draft exists, check if there's any uploaded document to create a draft from
        if (!draft) {
          console.log(`[Reel Scheduler] No draft found for user ${user_id}. Checking for documents...`);
          const docResult = await db.query(
            `SELECT * FROM documents 
             WHERE uploader_id = $1 
             ORDER BY created_at DESC LIMIT 1`,
            [user_id]
          );

          const doc = docResult.rows[0];
          if (doc) {
            console.log(`[Reel Scheduler] Auto-generating draft from latest document: ${doc.id}`);
            draft = await reelGeneratorService.generateDraftFromPaper(doc.id, user_id);
          } else {
            console.log(`[Reel Scheduler] No documents or drafts found for user ${user_id}. Skipping.`);
          }
        }

        // If we have a draft now, compile and publish it!
        if (draft) {
          console.log(`[Reel Scheduler] Compiling and publishing draft: ${draft.id}`);
          await reelGeneratorService.publishDraft(draft.id, user_id);
        }

        // Update the next upload schedule time
        const intervalHours = upload_interval_hours || 24;
        await db.query(
          `UPDATE reel_automation_settings 
           SET next_upload_at = NOW() + ($1 || ' hours')::INTERVAL, updated_at = NOW()
           WHERE user_id = $2`,
          [intervalHours.toString(), user_id]
        );
        console.log(`[Reel Scheduler] Updated next_upload_at for user ${user_id} by +${intervalHours} hours.`);

      } catch (err) {
        console.error(`[Reel Scheduler] Error processing upload for user ${user_id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[Reel Scheduler] Error running scheduler checks:', error.message);
  }
};

/**
 * Starts the background interval for the reel scheduler.
 * Runs every 30 seconds.
 */
const start = () => {
  if (schedulerInterval) {
    console.warn('[Reel Scheduler] Scheduler is already running.');
    return;
  }

  console.log('[Reel Scheduler] Starting background Reel Auto-Upload Scheduler (30s interval)...');
  // Check immediately, then every 30 seconds
  checkAndProcessAutoUploads();
  schedulerInterval = setInterval(checkAndProcessAutoUploads, 30 * 1000);
};

/**
 * Stops the background scheduler.
 */
const stop = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Reel Scheduler] Stopped background Reel Auto-Upload Scheduler.');
  }
};

module.exports = {
  start,
  stop,
  checkAndProcessAutoUploads
};
