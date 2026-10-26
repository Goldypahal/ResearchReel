const db = require('../config/db');
const redisClient = require('../config/redisClient');
const { sendNotificationEmail } = require('../utils/emailService');
const prefs = require('./emailPreferences');
const notificationService = require('./notificationService');

const FRONTEND_URL = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_ORIGIN = () => (process.env.PUBLIC_API_ORIGIN || process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');

/** At most one email per recipient for bursts of the same activity. */
const THROTTLE_SECONDS = { comment: 3600, reaction: 3600, lecture_question: 3600, lecture_registration: 3600, follow: 600 };

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
            u.email, u.full_name AS recipient_name, u.email_preferences, u.timezone, u.verification_status, u.is_deleted,
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
    const r = await db.query('SELECT title, starts_at, duration_minutes FROM lectures WHERE id = $1', [n.entity_id]);
    return r.rows[0] ? { title: r.rows[0].title, startsAt: r.rows[0].starts_at } : {};
  }
  return {};
};

/** Subject, heading, body and link for each notification type. */
const compose = (n, e) => {
  const site = FRONTEND_URL();
  const actor = n.actor_name || 'Someone';
  const postUrl = `${site}/post/${n.entity_id}`;
  const lectureUrl = `${site}/lectures/${n.entity_id}`;
  switch (n.type) {
    case 'comment':
      return { subject: `${actor} commented on your post`, heading: `${actor} commented on “${e.title || 'your post'}”`, quote: clip(n.message, 300), ctaLabel: 'Reply', ctaUrl: postUrl };
    case 'reaction':
      return { subject: `${actor} reacted to your post`, heading: `${actor} reacted to “${e.title || 'your post'}”`, ctaLabel: 'View post', ctaUrl: postUrl };
    case 'follow':
      return { subject: `${actor} started following you`, heading: `${actor} started following you on ResearchReel`, ctaLabel: 'View profile', ctaUrl: `${site}/profile/${n.actor_username}` };
    case 'project_invite':
      return { subject: `${actor} added you to ${e.title || 'a project'}`, heading: `${actor} added you to the project “${e.title || 'Untitled'}”`, ctaLabel: 'Open project', ctaUrl: `${site}/projects/${n.entity_id}` };
    case 'lecture_question':
      return { subject: `New question: ${e.title || 'your lecture'}`, heading: `${actor} asked a question in “${e.title || 'your lecture'}”`, quote: clip(n.message, 300), ctaLabel: 'Answer', ctaUrl: lectureUrl };
    case 'lecture_registration':
      return { subject: `${actor} registered for ${e.title || 'your lecture'}`, heading: `${actor} registered for “${e.title || 'your lecture'}”`, ctaLabel: 'See attendees', ctaUrl: lectureUrl };
    case 'lecture_cancelled':
      return { subject: `Cancelled: ${e.title || n.message || 'a lecture'}`, heading: `“${e.title || n.message}” has been cancelled`, body: `${actor} cancelled this lecture. You don't need to do anything.`, ctaLabel: 'Browse other lectures', ctaUrl: `${site}/lectures` };
    case 'lecture_reminder': {
      const when = e.startsAt ? formatWhen(e.startsAt, n.timezone) : null;
      const soon = n.message === '1h';
      return {
        subject: soon ? `Starting soon: ${e.title}` : `Coming up: ${e.title}`,
        heading: soon ? `“${e.title}” starts in about an hour` : `Reminder: “${e.title}” is coming up`,
        body: when ? `It starts ${when}. The join link appears on the lecture page 15 minutes before the start.` : null,
        ctaLabel: 'Open lecture',
        ctaUrl: lectureUrl,
      };
    }
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
  if (n.is_deleted || !n.email || n.verification_status === 'unverified') return 'no-address';
  if (!prefs.wants(n.email_preferences, n.type)) return 'opted-out';

  const e = await entityDetails(n);
  if (n.entity_type === 'lecture' && !e.title) return 'entity-gone';
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
       WHERE l.cancelled_at IS NULL
         AND l.starts_at > NOW() + $3::interval
         AND l.starts_at <= NOW() + $2::interval
       ON CONFLICT DO NOTHING
       RETURNING lecture_id`,
      [r.kind, r.within, r.notInside]
    );
    for (const { lecture_id: lectureId } of due.rows) {
      const people = await db.query(
        `SELECT l.host_id, r.user_id FROM lectures l LEFT JOIN lecture_registrations r ON r.lecture_id = l.id WHERE l.id = $1`,
        [lectureId]
      );
      if (!people.rows.length) continue;
      const hostId = people.rows[0].host_id;
      const recipients = new Set(people.rows.map((p) => p.user_id).filter(Boolean));
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
