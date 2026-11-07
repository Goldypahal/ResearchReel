const db = require('../config/db');
const redisClient = require('../config/redisClient');
const { sendNotificationEmail, isEmailConfigured } = require('../utils/emailService');
const prefs = require('./emailPreferences');
const notificationService = require('./notificationService');

const FRONTEND_URL = () => (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
// One-click unsubscribe goes through the web app's /api proxy unless a public API origin is given.
const API_ORIGIN = () => (process.env.PUBLIC_API_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');

/** At most one email per recipient for bursts of the same activity. */
const THROTTLE_SECONDS = { comment: 3600, reply: 1800, mention: 1800, like: 3600, lecture_rsvp: 3600, follow: 600 };

const throttleKey = (n) =>
  n.type === 'follow' ? `emailthrottle:${n.user_id}:follow` : `emailthrottle:${n.user_id}:${n.type}:${n.entity_id || 'none'}`;

/** Returns true if this email may go out now (and claims the slot). */
const claimThrottle = async (n) => {
  const ttl = THROTTLE_SECONDS[n.type];
  if (!ttl) return true;
  try {
    return (await redisClient.client.set(throttleKey(n), '1', { NX: true, EX: ttl })) === 'OK';
  } catch {
    return true; // Redis trouble shouldn't silently drop important mail
  }
};

const formatWhen = (iso, timezone) => {
  const opts = { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };
  try {
    return new Date(iso).toLocaleString('en-US', { ...opts, timeZone: timezone || 'UTC' });
  } catch {
    return new Date(iso).toLocaleString('en-US', { ...opts, timeZone: 'UTC' });
  }
};

const clip = (s, n = 160) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

const loadContext = async (notificationId) => {
  const res = await db.query(
    `SELECT n.id, n.user_id, n.actor_id, n.type, n.entity_type, n.entity_id, n.message, n.emailed_at,
            u.email, u.email_verified, u.full_name AS recipient_name, u.email_preferences, u.timezone, u.is_deleted, u.is_suspended,
            a.username AS actor_username, COALESCE(NULLIF(a.full_name, ''), '@' || a.username) AS actor_name
     FROM notifications n
     JOIN users u ON u.id = n.user_id
     LEFT JOIN users a ON a.id = n.actor_id
     WHERE n.id = $1`,
    [notificationId]
  );
  return res.rows[0] || null;
};

const entityDetails = async (n) => {
  if (!n.entity_id) return {};
  if (n.entity_type === 'post') {
    const r = await db.query(
      `SELECT p.caption, d.title AS document_title FROM posts p LEFT JOIN documents d ON d.id = p.document_id WHERE p.id = $1`,
      [n.entity_id]
    );
    const row = r.rows[0];
    return row ? { title: row.document_title || clip(row.caption, 80) } : {};
  }
  if (n.entity_type === 'project') {
    const r = await db.query('SELECT name FROM projects WHERE id = $1', [n.entity_id]);
    return r.rows[0] ? { title: r.rows[0].name } : {};
  }
  if (n.entity_type === 'lecture') {
    const r = await db.query('SELECT title, scheduled_at FROM lectures WHERE id = $1', [n.entity_id]);
    return r.rows[0] ? { title: r.rows[0].title, startsAt: r.rows[0].scheduled_at } : {};
  }
  if (n.entity_type === 'video') {
    const r = await db.query('SELECT title FROM videos WHERE id = $1', [n.entity_id]);
    return r.rows[0] ? { title: r.rows[0].title } : {};
  }
  return {};
};

/** Subject, heading, body and link for each notification type. */
const compose = (n, e) => {
  const site = FRONTEND_URL();
  const actor = n.actor_name || 'Someone';
  const isReel = n.entity_type === 'video';
  const target = isReel ? `${site}/reels/${n.entity_id}` : `${site}/post/${n.entity_id}`;
  const thing = isReel ? 'your reel' : 'your post';
  const lectureUrl = `${site}/lectures/${n.entity_id}`;
  switch (n.type) {
    case 'comment':
      return { subject: `${actor} commented on ${thing}`, heading: `${actor} commented on “${e.title || thing}”`, quote: clip(n.message, 300), ctaLabel: 'Reply', ctaUrl: target };
    case 'reply':
      return { subject: `${actor} replied to you`, heading: `${actor} replied to your comment on “${e.title || 'a post'}”`, quote: clip(n.message, 300), ctaLabel: 'Reply', ctaUrl: target };
    case 'mention':
      return { subject: `${actor} mentioned you`, heading: `${actor} mentioned you on “${e.title || 'a post'}”`, quote: clip(n.message, 300), ctaLabel: 'View', ctaUrl: target };
    case 'like':
      return { subject: `${actor} liked ${thing}`, heading: `${actor} liked “${e.title || thing}”`, ctaLabel: 'View', ctaUrl: target };
    case 'follow':
      return { subject: `${actor} started following you`, heading: `${actor} started following you on ResearchReel`, ctaLabel: 'View profile', ctaUrl: `${site}/profile/${n.actor_username}` };
    case 'project_invite':
      return { subject: `${actor} added you to ${e.title || n.message || 'a project'}`, heading: `${actor} added you to the project “${e.title || n.message || 'Untitled'}”`, ctaLabel: 'Open project', ctaUrl: `${site}/projects/${n.entity_id}` };
    case 'task_assigned':
      return { subject: `${actor} assigned you a task`, heading: `${actor} assigned you a task${e.title ? ` in “${e.title}”` : ''}`, quote: clip(n.message, 200), ctaLabel: 'Open project', ctaUrl: `${site}/projects/${n.entity_id}` };
    case 'lecture_rsvp':
      return { subject: `${actor} registered for ${e.title || 'your lecture'}`, heading: `${actor} registered for “${e.title || 'your lecture'}”`, ctaLabel: 'Open lecture', ctaUrl: lectureUrl };
    case 'lecture_live':
      return { subject: `Live now: ${e.title || n.message || 'a lecture'}`, heading: `“${e.title || n.message}” has started`, body: `${actor} is live now.`, ctaLabel: 'Join', ctaUrl: lectureUrl };
    case 'lecture_cancelled':
      return { subject: `Cancelled: ${n.message || e.title || 'a lecture'}`, heading: `“${n.message || e.title}” has been cancelled`, body: `${actor} cancelled this lecture. You don't need to do anything.`, ctaLabel: 'Browse other lectures', ctaUrl: `${site}/lectures` };
    case 'lecture_reminder': {
      const when = e.startsAt ? formatWhen(e.startsAt, n.timezone) : null;
      const soon = n.message === '1h';
      return {
        subject: soon ? `Starting soon: ${e.title}` : `Coming up: ${e.title}`,
        heading: soon ? `“${e.title}” starts in about an hour` : `Reminder: “${e.title}” is coming up`,
        body: when ? `It starts ${when}. The join link is on the lecture page.` : null,
        ctaLabel: 'Open lecture',
        ctaUrl: lectureUrl
      };
    }
    case 'reel_ready':
      return { subject: 'Your reel is live', heading: n.message || 'Your reel finished processing and is now live.', ctaLabel: 'Watch it', ctaUrl: target };
    case 'reel_failed':
      return { subject: 'A reel failed to process', heading: n.message || 'One of your reels could not be processed.', body: 'Open the reel generator to try again.', ctaLabel: 'Open generator', ctaUrl: `${site}/reels/generator` };
    default:
      return null;
  }
};

/**
 * Sends the email for one in-app notification, if the recipient wants it.
 * Returns a short reason string (useful in logs and tests).
 */
const deliver = async (notificationId) => {
  const n = await loadContext(notificationId);
  if (!n) return 'missing';
  if (n.emailed_at) return 'already-sent';
  if (n.is_deleted || n.is_suspended || !n.email || !n.email_verified) return 'no-address';
  if (!isEmailConfigured() && process.env.NODE_ENV !== 'test') return 'no-smtp';
  if (!prefs.wants(n.email_preferences, n.type)) return 'opted-out';

  const e = await entityDetails(n);
  if (n.entity_type === 'lecture' && !e.title && n.type !== 'lecture_cancelled') return 'entity-gone';
  const content = compose(n, e);
  if (!content) return 'not-emailable';
  if (!(await claimThrottle(n))) return 'throttled';

  const category = prefs.CATEGORY_FOR_TYPE[n.type];
  const token = prefs.unsubscribeToken(n.user_id, category);
  const label = prefs.CATEGORIES.find((c) => c.key === category).label.toLowerCase();
  await sendNotificationEmail({
    to: n.email,
    ...content,
    reason: `You're getting this because email notifications for ${label} are on.`,
    unsubscribeUrl: `${FRONTEND_URL()}/unsubscribe?token=${encodeURIComponent(token)}`,
    oneClickUrl: `${API_ORIGIN()}/api/v1/notifications/unsubscribe?token=${encodeURIComponent(token)}`,
  });
  await db.query('UPDATE notifications SET emailed_at = NOW() WHERE id = $1', [n.id]);
  return 'sent';
};

const REMINDERS = [
  // kind, send when the lecture starts within `within`, but not if it's already closer than `notInside`
  { kind: '24h', within: '24 hours', notInside: '2 hours' },
  { kind: '1h', within: '65 minutes', notInside: '0 minutes' },
];

/**
 * Finds lectures due a reminder, records the reminder once, and creates an
 * in-app "lecture_reminder" notification for each attendee and the host. The
 * normal notification path then emails whoever has reminders switched on.
 */
const sendLectureReminders = async () => {
  let created = 0;
  for (const r of REMINDERS) {
    const due = await db.query(
      `INSERT INTO lecture_reminders (lecture_id, kind)
       SELECT l.id, $1 FROM lectures l
       WHERE l.status = 'scheduled'
         AND l.scheduled_at > NOW() + $3::interval
         AND l.scheduled_at <= NOW() + $2::interval
       ON CONFLICT DO NOTHING
       RETURNING lecture_id`,
      [r.kind, r.within, r.notInside]
    );
    for (const { lecture_id: lectureId } of due.rows) {
      const people = await db.query(
        `SELECT l.host_id, a.user_id FROM lectures l LEFT JOIN lecture_attendees a ON a.lecture_id = l.id WHERE l.id = $1`,
        [lectureId]
      );
      if (!people.rows.length) continue;
      const hostId = people.rows[0].host_id;
      const recipients = new Set(people.rows.map((p) => p.user_id).filter((id) => id && id !== hostId));
      for (const userId of recipients) {
        if (await notificationService.notify({ userId, actorId: hostId, type: 'lecture_reminder', entityType: 'lecture', entityId: lectureId, message: r.kind })) created += 1;
      }
      // The host gets the reminder too (no actor, so it isn't skipped as self-notification).
      if (await notificationService.notify({ userId: hostId, actorId: null, type: 'lecture_reminder', entityType: 'lecture', entityId: lectureId, message: r.kind })) created += 1;
    }
  }
  return created;
};

module.exports = { deliver, compose, sendLectureReminders, formatWhen };
