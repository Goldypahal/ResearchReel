const db = require('../config/db');

/**
 * View/interaction tracking. Events are buffered in memory and inserted in batches.
 */
const BATCH_SIZE = 50;
const BATCH_INTERVAL_MS = 5000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let queue = [];
let timer = null;

const flushQueue = async () => {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  const values = [];
  const rows = batch.map((e, i) => {
    values.push(e.user_id, e.event_type, e.entity_id, e.entity_type, e.metadata ? JSON.stringify(e.metadata) : null);
    const o = i * 5;
    return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5})`;
  });
  try {
    await db.query(`INSERT INTO analytics_events (user_id, event_type, entity_id, entity_type, metadata) VALUES ${rows.join(', ')}`, values);
  } catch (error) {
    console.error('[analytics] Failed to write events:', error.message);
  }
};

const trackEvent = async ({ user_id: userId, event_type: eventType, entity_id: entityId, entity_type: entityType, metadata = null }) => {
  if (!eventType) return;
  queue.push({
    user_id: userId && UUID_RE.test(String(userId)) ? userId : null,
    event_type: String(eventType).slice(0, 60),
    entity_id: entityId && UUID_RE.test(String(entityId)) ? entityId : null,
    entity_type: entityType ? String(entityType).slice(0, 40) : null,
    metadata
  });
  if (process.env.NODE_ENV === 'test' || queue.length >= BATCH_SIZE) return flushQueue();
  if (!timer) {
    timer = setTimeout(flushQueue, BATCH_INTERVAL_MS);
    if (timer.unref) timer.unref();
  }
};

/** Creator analytics for the profile dashboard (last 30 days + totals). */
const getProfileAnalytics = async (userId) => {
  const growth = await db.query(
    `SELECT to_char(d::date, 'YYYY-MM-DD') AS day,
            (SELECT COUNT(*)::int FROM follows f WHERE f.following_id = $1 AND f.created_at::date = d::date) AS new_followers
       FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') d
      ORDER BY d`,
    [userId]
  );
  const top = await db.query(
    `SELECT * FROM (
       SELECT p.id, COALESCE(NULLIF(left(p.caption, 80), ''), 'Untitled post') AS title, p.content_type AS type, p.created_at,
              (SELECT COUNT(*)::int FROM analytics_events e WHERE e.entity_id = p.id AND e.event_type = 'view_post') AS views,
              ((SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id)
               + (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL))::int AS interactions
         FROM posts p WHERE p.author_id = $1 AND p.deleted_at IS NULL AND p.content_type <> 'video'
       UNION ALL
       SELECT v.id, v.title, 'reel', v.created_at,
              (SELECT COUNT(*)::int FROM analytics_events e WHERE e.entity_id = v.id AND e.event_type = 'view_video'),
              ((SELECT COUNT(*) FROM video_likes l WHERE l.video_id = v.id)
               + (SELECT COUNT(*) FROM video_comments c WHERE c.video_id = v.id AND c.deleted_at IS NULL))::int
         FROM videos v WHERE v.author_id = $1 AND v.deleted_at IS NULL
     ) x ORDER BY interactions DESC, views DESC, created_at DESC LIMIT 5`,
    [userId]
  );
  const totals = await db.query(
    `SELECT (SELECT COUNT(*)::int FROM follows WHERE following_id = $1) AS followers,
            (SELECT COUNT(*)::int FROM analytics_events e JOIN posts p ON p.id = e.entity_id WHERE p.author_id = $1 AND e.event_type = 'view_post'
               AND e.created_at > NOW() - INTERVAL '30 days')
            + (SELECT COUNT(*)::int FROM analytics_events e JOIN videos v ON v.id = e.entity_id WHERE v.author_id = $1 AND e.event_type = 'view_video'
               AND e.created_at > NOW() - INTERVAL '30 days') AS views_30d,
            (SELECT COUNT(*)::int FROM reactions r JOIN posts p ON p.id = r.post_id WHERE p.author_id = $1 AND r.created_at > NOW() - INTERVAL '30 days')
            + (SELECT COUNT(*)::int FROM video_likes l JOIN videos v ON v.id = l.video_id WHERE v.author_id = $1 AND l.created_at > NOW() - INTERVAL '30 days') AS likes_30d,
            (SELECT COUNT(*)::int FROM post_comments c JOIN posts p ON p.id = c.post_id WHERE p.author_id = $1 AND c.deleted_at IS NULL AND c.created_at > NOW() - INTERVAL '30 days') AS comments_30d,
            (SELECT COUNT(*)::int FROM documents WHERE uploader_id = $1 AND deleted_at IS NULL) AS papers`,
    [userId]
  );
  const t = totals.rows[0];
  const engagement = t.views_30d > 0 ? Math.min(100, ((t.likes_30d + t.comments_30d) / t.views_30d) * 100) : 0;
  return {
    totals: t,
    engagement_rate: `${engagement.toFixed(1)}%`,
    follower_growth: growth.rows,
    top_content: top.rows
  };
};

module.exports = { trackEvent, getProfileAnalytics, flushQueue };
