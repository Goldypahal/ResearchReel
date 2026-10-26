const db = require('../config/db');
const redisClient = require('../config/redisClient');
const { EventEmitter } = require('events');

const analyticsEmitter = new EventEmitter();

const BATCH_SIZE = 50;
const BATCH_INTERVAL_MS = 5000;
const VIEW_DEDUPE_SECONDS = 6 * 60 * 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let eventQueue = [];
let batchTimeout = null;

/** Writes queued events in one parameterised INSERT. The table is created by migrations. */
const flushQueue = async () => {
  if (eventQueue.length === 0) return;
  const batch = eventQueue;
  eventQueue = [];
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }

  const values = [];
  const rows = batch.map((e, i) => {
    const o = i * 5;
    values.push(e.user_id || null, e.event_type, e.entity_id || null, e.entity_type || null, e.metadata ? JSON.stringify(e.metadata) : null);
    return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5})`;
  });

  try {
    await db.query(
      `INSERT INTO analytics_events (user_id, event_type, entity_id, entity_type, metadata) VALUES ${rows.join(', ')}`,
      values
    );
  } catch (error) {
    console.error(`Failed to write ${batch.length} analytics events:`, error.message);
  }
};

/** Queue an event. Invalid ids are dropped rather than failing the whole batch. */
const trackEvent = async ({ user_id, event_type, entity_id, entity_type, metadata = {} }) => {
  if (!event_type) return;
  const event = {
    user_id: user_id && UUID_RE.test(user_id) ? user_id : null,
    event_type: String(event_type).slice(0, 50),
    entity_id: entity_id && UUID_RE.test(entity_id) ? entity_id : null,
    entity_type: entity_type ? String(entity_type).slice(0, 50) : null,
    metadata,
  };
  analyticsEmitter.emit('event', event);
  eventQueue.push(event);

  if (eventQueue.length >= BATCH_SIZE) {
    await flushQueue();
  } else if (!batchTimeout) {
    batchTimeout = setTimeout(flushQueue, BATCH_INTERVAL_MS);
    if (typeof batchTimeout.unref === 'function') batchTimeout.unref();
  }
};

/**
 * Records a view at most once per viewer per entity every 6 hours, so
 * refreshing a page doesn't inflate counts. Returns true if it was counted.
 */
const recordView = async ({ viewerKey, user_id, event_type, entity_id, entity_type }) => {
  if (!entity_id || !UUID_RE.test(entity_id)) return false;
  try {
    const fresh = await redisClient.set(`view:${event_type}:${entity_id}:${viewerKey}`, '1', { NX: true, EX: VIEW_DEDUPE_SECONDS });
    if (fresh === null) return false;
  } catch {
    // Redis down: still count the view rather than lose it.
  }
  await trackEvent({ user_id, event_type, entity_id, entity_type });
  return true;
};

const PERIODS = { 7: 7, 30: 30, 90: 90 };

/** Daily buckets for the last `days` days, including today, zero-filled. */
const dailySeries = async (sql, params, days) => {
  const { rows } = await db.query(
    `WITH days AS (
       SELECT generate_series(CURRENT_DATE - ($2::int - 1), CURRENT_DATE, INTERVAL '1 day')::date AS day
     ),
     hits AS (${sql})
     SELECT to_char(days.day, 'YYYY-MM-DD') AS date, COALESCE(hits.count, 0)::int AS count
     FROM days LEFT JOIN hits ON hits.day = days.day
     ORDER BY days.day`,
    [params[0], days]
  );
  return rows;
};

const sumWindow = async (sql, userId, days) => {
  const { rows } = await db.query(sql, [userId, days]);
  return Number(rows[0]?.count || 0);
};

/**
 * Engagement for one author over a window (7/30/90 days), with the
 * previous window of the same length for change indicators.
 * Every number here is counted from stored events — nothing is estimated.
 */
const getProfileAnalytics = async (userId, requestedDays = 30) => {
  const days = PERIODS[Number(requestedDays)] || 30;

  const window = (inner) => `SELECT COUNT(*)::int AS count FROM (${inner}) x`;
  const metricSql = {
    post_views: `SELECT 1 FROM analytics_events ae JOIN posts p ON p.id = ae.entity_id
                 WHERE p.author_id = $1 AND ae.event_type = 'view_post' AND ae.created_at >= NOW() - make_interval(days => $2::int)`,
    reel_views: `SELECT 1 FROM analytics_events ae JOIN videos v ON v.id = ae.entity_id
                 WHERE v.author_id = $1 AND ae.event_type = 'view_reel' AND ae.created_at >= NOW() - make_interval(days => $2::int)`,
    reactions: `SELECT 1 FROM reactions r JOIN posts p ON p.id = r.post_id
                WHERE p.author_id = $1 AND r.user_id <> $1 AND r.created_at >= NOW() - make_interval(days => $2::int)`,
    comments: `SELECT 1 FROM comments c JOIN posts p ON p.id = c.post_id
               WHERE p.author_id = $1 AND c.author_id <> $1 AND c.created_at >= NOW() - make_interval(days => $2::int)`,
    new_followers: `SELECT 1 FROM follows f WHERE f.following_id = $1 AND f.created_at >= NOW() - make_interval(days => $2::int)`,
  };
  const metrics = {};
  for (const [key, sql] of Object.entries(metricSql)) {
    const current = await sumWindow(window(sql), userId, days);
    // Previous window = [2*days ago, days ago): count 2*days and subtract the current window.
    const both = await sumWindow(window(sql), userId, days * 2);
    metrics[key] = { value: current, previous: Math.max(both - current, 0) };
  }

  const totalViews = metrics.post_views.value + metrics.reel_views.value;
  const interactions = metrics.reactions.value + metrics.comments.value;

  const viewsSeries = await dailySeries(
    `SELECT DATE(ae.created_at) AS day, COUNT(*) AS count
     FROM analytics_events ae
     LEFT JOIN posts p ON p.id = ae.entity_id AND ae.event_type = 'view_post'
     LEFT JOIN videos v ON v.id = ae.entity_id AND ae.event_type = 'view_reel'
     WHERE (p.author_id = $1 OR v.author_id = $1) AND ae.created_at >= CURRENT_DATE - ($2::int - 1)
     GROUP BY 1`,
    [userId], days
  );
  const followerSeries = await dailySeries(
    `SELECT DATE(created_at) AS day, COUNT(*) AS count FROM follows
     WHERE following_id = $1 AND created_at >= CURRENT_DATE - ($2::int - 1) GROUP BY 1`,
    [userId], days
  );

  const { rows: top } = await db.query(
    `SELECT p.id, COALESCE(NULLIF(p.caption, ''), d.title, 'Untitled post') AS title, p.content_type AS type, p.created_at,
            (SELECT COUNT(*)::int FROM analytics_events ae WHERE ae.entity_id = p.id AND ae.event_type = 'view_post'
               AND ae.created_at >= NOW() - make_interval(days => $2::int)) AS views,
            (SELECT COUNT(*)::int FROM reactions r WHERE r.post_id = p.id) AS reactions,
            (SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id) AS comments
     FROM posts p LEFT JOIN documents d ON d.id = p.document_id
     WHERE p.author_id = $1 AND p.deleted_at IS NULL
     ORDER BY views DESC, reactions DESC, p.created_at DESC
     LIMIT 5`,
    [userId, days]
  );

  return {
    period_days: days,
    metrics,
    total_views: totalViews,
    engagement_rate: totalViews > 0 ? Number(((interactions / totalViews) * 100).toFixed(1)) : null,
    views_series: viewsSeries,
    follower_series: followerSeries,
    top_posts: top.map((r) => ({ ...r, title: String(r.title).slice(0, 140) })),
  };
};

module.exports = {
  trackEvent,
  recordView,
  flushQueue,
  getProfileAnalytics,
  emitter: analyticsEmitter,
};
