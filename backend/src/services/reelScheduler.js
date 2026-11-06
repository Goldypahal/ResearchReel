const db = require('../config/db');
const redisClient = require('../config/redisClient');
const reelGeneratorService = require('./reelGeneratorService');

let timer = null;
const LOCK_KEY = 'lock:reel-scheduler';

/**
 * For users with auto-upload on: when their interval elapses, publish the oldest pending
 * draft, or generate one from their newest paper that has no reel yet.
 * A Redis lock ensures only one instance runs a cycle at a time.
 */
const runCycle = async () => {
  const gotLock = await redisClient.client.set(LOCK_KEY, String(process.pid), { NX: true, EX: 240 }).catch(() => null);
  if (!gotLock) return;
  try {
    const due = await db.query(
      `SELECT user_id, upload_interval_hours FROM reel_automation_settings
        WHERE auto_upload = TRUE AND next_upload_at IS NOT NULL AND next_upload_at <= NOW() LIMIT 20`
    );
    for (const s of due.rows) {
      try {
        let draftId = null;
        const pending = await db.query(
          `SELECT id FROM reel_drafts WHERE author_id = $1 AND status = 'draft' ORDER BY created_at ASC LIMIT 1`,
          [s.user_id]
        );
        if (pending.rows[0]) draftId = pending.rows[0].id;
        else {
          const doc = await db.query(
            `SELECT d.id FROM documents d
              WHERE d.uploader_id = $1 AND d.deleted_at IS NULL
                AND NOT EXISTS (SELECT 1 FROM reel_drafts rd WHERE rd.linked_paper_id = d.id)
              ORDER BY d.created_at DESC LIMIT 1`,
            [s.user_id]
          );
          if (doc.rows[0]) {
            const draft = await reelGeneratorService.generateDraftFromPaper(doc.rows[0].id, s.user_id);
            draftId = draft?.id || null;
          }
        }
        if (draftId) await reelGeneratorService.publishDraft(draftId, s.user_id);
      } catch (err) {
        console.error(`[reel-scheduler] user ${s.user_id}: ${err.message}`);
      } finally {
        await db.query(
          `UPDATE reel_automation_settings SET next_upload_at = NOW() + make_interval(hours => $1), updated_at = NOW() WHERE user_id = $2`,
          [s.upload_interval_hours || 24, s.user_id]
        );
      }
    }
  } catch (error) {
    console.error('[reel-scheduler] cycle failed:', error.message);
  } finally {
    await redisClient.del(LOCK_KEY);
  }
};

const start = (intervalMs = 5 * 60 * 1000) => {
  if (timer) return;
  timer = setInterval(() => runCycle().catch(() => {}), intervalMs);
  if (timer.unref) timer.unref();
};

const stop = () => { if (timer) clearInterval(timer); timer = null; };

module.exports = { start, stop, runCycle };
