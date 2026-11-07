const db = require('../config/db');
const { notify } = require('./notificationService');
const { moderateText } = require('../utils/moderator');
const { notBlocked, isBlockedEitherWay } = require('./blockService');

/** Comments by accounts blocked either way are left out for that viewer. */
const visibleAuthor = (viewer) => (viewer ? `AND (c.author_id = ${viewer} OR ${notBlocked(viewer, 'c.author_id')})` : '');

/** A post whose author blocked the viewer (or vice versa) doesn't exist for them. */
const assertPostVisible = async (postId, viewerId) => {
  const post = isUuid(postId)
    ? (await db.query('SELECT id, author_id FROM posts WHERE id = $1 AND deleted_at IS NULL', [postId])).rows[0]
    : null;
  if (!post || (viewerId && await isBlockedEitherWay(viewerId, post.author_id))) throw fail('Post not found.', 404, 'NOT_FOUND');
  return post;
};

const MAX_LENGTH = 2000;
const MAX_MENTIONS = 10;
const PAGE = 20;
const REPLY_PAGE = 20;

const fail = (message, statusCode = 400, code = 'VALIDATION_ERROR') => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

/** @handles in text, in order, without duplicates. Usernames: letters, digits, dot, underscore. */
const extractMentions = (text) => {
  const seen = new Set();
  for (const m of String(text).matchAll(/(^|[^\w@.])@([A-Za-z0-9_.]{3,30})/g)) {
    const name = m[2].replace(/\.+$/, '').toLowerCase();
    if (name.length >= 3) seen.add(name);
    if (seen.size >= MAX_MENTIONS) break;
  }
  return [...seen];
};

const cleanContent = (raw) => {
  const content = String(raw || '').trim();
  if (!content) throw fail('Write something first.');
  if (content.length > MAX_LENGTH) throw fail(`Comments are limited to ${MAX_LENGTH} characters.`);
  if (!moderateText(content).clean) throw fail('This comment goes against our community guidelines.', 400, 'CONTENT_POLICY');
  return content;
};

/**
 * One SELECT shape for every comment we return. Deleted comments are kept as
 * tombstones (no text, no author) so replies under them still make sense.
 */
const SELECT = (viewer) => `
  SELECT c.id, c.post_id, c.parent_id, c.created_at, c.edited_at,
         (c.deleted_at IS NOT NULL) AS is_deleted,
         CASE WHEN c.deleted_at IS NULL THEN c.content ELSE NULL END AS content,
         CASE WHEN c.deleted_at IS NULL THEN u.id END AS author_id,
         CASE WHEN c.deleted_at IS NULL THEN u.username END AS username,
         CASE WHEN c.deleted_at IS NULL THEN u.full_name END AS full_name,
         CASE WHEN c.deleted_at IS NULL THEN u.verification_status END AS verification_status,
         CASE WHEN c.deleted_at IS NULL THEN COALESCE(u.avatar_url, u.profile_picture_url) END AS avatar_url,
         ru.username AS reply_to_username,
         (SELECT COUNT(*)::int FROM comment_likes l WHERE l.comment_id = c.id) AS like_count,
         (SELECT COUNT(*)::int FROM comments r WHERE r.parent_id = c.id AND r.deleted_at IS NULL) AS reply_count,
         ${viewer ? `EXISTS (SELECT 1 FROM comment_likes l WHERE l.comment_id = c.id AND l.user_id = ${viewer})` : 'FALSE'} AS viewer_liked,
         (c.author_id = p.author_id AND c.deleted_at IS NULL) AS is_post_author
  FROM comments c
  JOIN users u ON u.id = c.author_id
  JOIN posts p ON p.id = c.post_id
  LEFT JOIN users ru ON ru.id = c.reply_to_user_id`;

/** Top-level comments for a post. sort=top (likes, then replies) or new; cursor is an offset. */
const listTopLevel = async (postId, { viewerId, sort = 'top', cursor, limit = PAGE } = {}) => {
  const size = Math.min(Math.max(Number(limit) || PAGE, 1), 50);
  const offset = Math.max(Number(cursor) || 0, 0);
  await assertPostVisible(postId, viewerId);
  const params = [postId];
  const viewer = viewerId ? (params.push(viewerId), `$${params.length}`) : null;
  const order = sort === 'new'
    ? 'c.created_at DESC'
    : 'like_count DESC, reply_count DESC, c.created_at ASC';
  params.push(size + 1, offset);
  const res = await db.query(
    `SELECT * FROM (${SELECT(viewer)}
       WHERE c.post_id = $1 AND c.parent_id IS NULL ${visibleAuthor(viewer)}
     ) c
     -- Tombstones only stay while they still have replies.
     WHERE (NOT c.is_deleted OR c.reply_count > 0)
     ORDER BY ${order}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const items = res.rows.slice(0, size);
  return { items, nextCursor: res.rows.length > size ? String(offset + size) : null };
};

/** Replies under one top-level comment, oldest first. cursor = created_at of the last reply seen. */
const listReplies = async (postId, commentId, { viewerId, cursor, limit = REPLY_PAGE } = {}) => {
  if (!isUuid(commentId)) throw fail('Comment not found.', 404, 'NOT_FOUND');
  const size = Math.min(Math.max(Number(limit) || REPLY_PAGE, 1), 50);
  await assertPostVisible(postId, viewerId);
  const params = [postId, commentId];
  const viewer = viewerId ? (params.push(viewerId), `$${params.length}`) : null;
  let after = '';
  if (cursor && !Number.isNaN(new Date(cursor).getTime())) {
    params.push(new Date(cursor).toISOString());
    after = `AND c.created_at > $${params.length}`;
  }
  params.push(size + 1);
  const res = await db.query(
    `${SELECT(viewer)}
     WHERE c.post_id = $1 AND c.parent_id = $2 AND c.deleted_at IS NULL ${visibleAuthor(viewer)} ${after}
     ORDER BY c.created_at ASC
     LIMIT $${params.length}`,
    params
  );
  const items = res.rows.slice(0, size);
  return { items, nextCursor: res.rows.length > size ? items[items.length - 1].created_at.toISOString() : null };
};

const getOne = async (commentId, viewerId) => {
  const params = [commentId];
  const viewer = viewerId ? (params.push(viewerId), `$${params.length}`) : null;
  const res = await db.query(`${SELECT(viewer)} WHERE c.id = $1`, params);
  return res.rows[0] || null;
};

/**
 * Adds a comment or reply. Replying to a reply keeps the thread two levels
 * deep: it attaches to the same top-level comment and records who was answered.
 * Notifies (once per person): mentioned users, the person replied to, and the
 * post's author.
 */
const create = async ({ postId, authorId, content: raw, parentId }) => {
  const content = cleanContent(raw);
  const post = await assertPostVisible(postId, authorId);

  let rootId = null;
  let replyToUserId = null;
  if (parentId) {
    if (!isUuid(parentId)) throw fail('The comment you replied to no longer exists.', 404, 'NOT_FOUND');
    const parent = (await db.query(
      'SELECT id, parent_id, author_id, deleted_at FROM comments WHERE id = $1 AND post_id = $2',
      [parentId, postId]
    )).rows[0];
    if (!parent || parent.deleted_at) throw fail('The comment you replied to no longer exists.', 404, 'NOT_FOUND');
    if (await isBlockedEitherWay(authorId, parent.author_id)) throw fail("You can't reply to this comment.", 403, 'BLOCKED');
    rootId = parent.parent_id || parent.id;
    replyToUserId = parent.author_id;
  }

  const inserted = await db.query(
    `INSERT INTO comments (post_id, author_id, content, parent_id, reply_to_user_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [postId, authorId, content, rootId, replyToUserId]
  );
  const id = inserted.rows[0].id;

  // Work out who to tell, strongest reason first, one notification each.
  const told = new Set([authorId]);
  const handles = extractMentions(content);
  if (handles.length) {
    const mentioned = await db.query(
      `SELECT id FROM users WHERE lower(username) = ANY($1::text[]) AND (is_deleted IS NOT TRUE)`,
      [handles]
    );
    for (const { id: userId } of mentioned.rows) {
      if (told.has(userId)) continue;
      told.add(userId);
      await notify({ userId, actorId: authorId, type: 'mention', entityType: 'post', entityId: postId, message: content.slice(0, 140) });
    }
  }
  if (replyToUserId && !told.has(replyToUserId)) {
    told.add(replyToUserId);
    await notify({ userId: replyToUserId, actorId: authorId, type: 'reply', entityType: 'post', entityId: postId, message: content.slice(0, 140) });
  }
  if (!told.has(post.author_id)) {
    await notify({ userId: post.author_id, actorId: authorId, type: 'comment', entityType: 'post', entityId: postId, message: content.slice(0, 140) });
  }

  return getOne(id, authorId);
};

const update = async ({ postId, commentId, userId, content: raw }) => {
  if (!isUuid(commentId)) throw fail('Comment not found.', 404, 'NOT_FOUND');
  const content = cleanContent(raw);
  const res = await db.query(
    `UPDATE comments SET content = $4, edited_at = NOW()
     WHERE id = $1 AND post_id = $2 AND author_id = $3 AND deleted_at IS NULL AND content IS DISTINCT FROM $4
     RETURNING id`,
    [commentId, postId, userId, content]
  );
  if (!res.rows.length) {
    const exists = (await db.query('SELECT author_id, deleted_at FROM comments WHERE id = $1 AND post_id = $2', [commentId, postId])).rows[0];
    if (!exists || exists.deleted_at) throw fail('Comment not found.', 404, 'NOT_FOUND');
    if (exists.author_id !== userId) throw fail('You can only edit your own comments.', 403, 'AUTHORIZATION_ERROR');
  }
  return getOne(commentId, userId);
};

/** Authors delete their own comments; post authors can remove comments on their post. */
const remove = async ({ postId, commentId, userId }) => {
  if (!isUuid(commentId)) return false;
  const res = await db.query(
    `UPDATE comments SET deleted_at = NOW()
     WHERE id = $1 AND post_id = $2 AND deleted_at IS NULL
       AND (author_id = $3 OR EXISTS (SELECT 1 FROM posts WHERE id = $2 AND author_id = $3))
     RETURNING id`,
    [commentId, postId, userId]
  );
  return res.rowCount > 0;
};

const setLike = async ({ postId, commentId, userId, liked }) => {
  if (!isUuid(commentId)) throw fail('Comment not found.', 404, 'NOT_FOUND');
  const exists = await db.query('SELECT 1 FROM comments WHERE id = $1 AND post_id = $2 AND deleted_at IS NULL', [commentId, postId]);
  if (!exists.rows.length) throw fail('Comment not found.', 404, 'NOT_FOUND');
  if (liked) {
    await db.query('INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [commentId, userId]);
  } else {
    await db.query('DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, userId]);
  }
  const res = await db.query(
    `SELECT COUNT(*)::int AS like_count, BOOL_OR(user_id = $2) AS viewer_liked FROM comment_likes WHERE comment_id = $1`,
    [commentId, userId]
  );
  return { id: commentId, like_count: res.rows[0].like_count, viewer_liked: Boolean(res.rows[0].viewer_liked) };
};

module.exports = { listTopLevel, listReplies, getOne, create, update, remove, setLike, extractMentions, isUuid };
