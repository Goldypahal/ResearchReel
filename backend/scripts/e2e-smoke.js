/* eslint-disable no-console */
/**
 * End-to-end smoke test against a running API with a real Postgres + Redis.
 *
 *   API_URL=http://localhost:5000/api/v1 REDIS_URL=redis://localhost:6379 node scripts/e2e-smoke.js
 *
 * Creates two throwaway accounts and walks every flow the web app depends on:
 * auth (register → OTP → login → refresh → logout), profiles, follows, feed,
 * reactions, comments, bookmarks, notifications, stories, direct messages over
 * REST and Socket.IO, document upload + text extraction, projects/tasks,
 * workspaces, leaderboard and achievements. Exits non-zero on the first failure.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('redis');
const { io } = require('socket.io-client');

const API = (process.env.API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const ORIGIN = new URL(API).origin;
const run = Date.now().toString(36);
let passed = 0;

const assert = (cond, msg, extra) => {
  if (!cond) {
    console.error(`\n✗ ${msg}`);
    if (extra !== undefined) console.error(typeof extra === 'string' ? extra : JSON.stringify(extra, null, 2));
    process.exit(1);
  }
  passed += 1;
  console.log(`✓ ${msg}`);
};

/** Minimal cookie-aware client, like a browser with credentials: 'include'. */
class Client {
  constructor() { this.cookies = {}; }
  cookieHeader() { return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; '); }
  store(res) {
    for (const c of res.headers.getSetCookie ? res.headers.getSetCookie() : []) {
      const [pair] = c.split(';');
      const [k, ...v] = pair.split('=');
      const value = v.join('=');
      if (/expires=Thu, 01 Jan 1970/i.test(c) || value === '') delete this.cookies[k.trim()];
      else this.cookies[k.trim()] = value;
    }
  }
  async req(method, url, body, { raw = false, headers = {} } = {}) {
    const isForm = body instanceof FormData;
    const res = await fetch(`${API}${url}`, {
      method,
      headers: {
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(Object.keys(this.cookies).length ? { Cookie: this.cookieHeader() } : {}),
        ...headers
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined
    });
    this.store(res);
    const json = await res.json().catch(() => ({}));
    return raw ? { status: res.status, json } : { status: res.status, data: json.data, json };
  }
}

const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

const signUp = async (client, username) => {
  const email = `${username}@example.org`;
  const reg = await client.req('POST', '/auth/register', {
    email, username, password: 'correct-horse-battery', full_name: `Dr ${username}`
  });
  assert(reg.status === 201 && reg.data.requiresVerification, `register ${username}`, reg.json);

  const early = await client.req('POST', '/auth/login', { email, password: 'correct-horse-battery' });
  assert(early.status === 200 && early.data.requiresVerification && !early.json.token,
    'unverified login asks for a code instead of issuing a session', early.json);

  const otp = JSON.parse(await redis.get(`otp:${email}`)).otp;
  const ver = await client.req('POST', '/auth/verify-otp', { email, otp });
  assert(ver.status === 200 && ver.data.user.username === username, `verify OTP ${username}`, ver.json);
  assert(!('password_hash' in ver.data.user), 'verified user payload has no password hash');
  assert(client.cookies.accessToken && client.cookies.refreshToken, 'session cookies set');
  return { email, user: ver.data.user };
};

const waitFor = async (fn, label, tries = 30) => {
  for (let i = 0; i < tries; i += 1) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 300));
  }
  assert(false, label);
  return null;
};

(async () => {
  await redis.connect();
  const ada = new Client();
  const ben = new Client();
  const adaName = `ada_${run}`;
  const benName = `ben_${run}`;

  // --- Auth -------------------------------------------------------------
  const { email: adaEmail } = await signUp(ada, adaName);
  await signUp(ben, benName);

  const bad = await new Client().req('POST', '/auth/login', { email: adaEmail, password: 'wrong-password' });
  assert(bad.status === 401, 'wrong password rejected');

  const login = await ada.req('POST', '/auth/login', { email: adaEmail, password: 'correct-horse-battery' });
  assert(login.status === 200 && login.json.token && !('password_hash' in login.data.user),
    'login returns a session and no password hash', login.json);

  const me = await ada.req('GET', '/users/me');
  assert(me.status === 200 && me.data.username === adaName, '/users/me', me.json);

  const refreshAsAccess = await new Client().req('GET', '/users/me', null, {
    headers: { Authorization: `Bearer ${ada.cookies.refreshToken}` }
  });
  assert(refreshAsAccess.status === 401, 'refresh token cannot be used as an access token');

  // --- Profile ----------------------------------------------------------
  const upd = await ada.req('PUT', '/users/update', {
    bio: 'Protein folding and graph neural nets.', institution: 'Example University',
    research_interests: ['Bioinformatics', 'Machine Learning']
  });
  assert(upd.status === 200 && upd.data.institution === 'Example University', 'profile update', upd.json);

  // --- Follow graph + notifications --------------------------------------
  const fol = await ben.req('POST', `/users/${adaName}/follow`);
  assert(fol.status === 200 && fol.data.is_following, 'ben follows ada', fol.json);
  const self = await ada.req('POST', `/users/${adaName}/follow`);
  assert(self.status === 400, 'cannot follow yourself');

  const prof = await ben.req('GET', `/users/${adaName}`);
  assert(prof.data.follower_count === 1 && prof.data.is_following === true, 'profile counts + is_following', prof.data);
  const anonProf = await new Client().req('GET', `/users/${adaName}`);
  assert(anonProf.status === 200 && anonProf.data.is_following === false, 'profile is public');

  const followers = await ada.req('GET', `/users/${adaName}/followers`);
  assert(followers.data.length === 1 && followers.data[0].username === benName, 'followers list', followers.data);

  const sugg = await ada.req('GET', '/users/me/suggestions');
  assert(sugg.status === 200 && Array.isArray(sugg.data), 'follow suggestions', sugg.json);
  const found = await ben.req('GET', `/users/search?q=${encodeURIComponent('example univ')}`);
  assert(found.data.some((u) => u.username === adaName), 'user search by institution', found.data);

  // --- Posts / feed -----------------------------------------------------
  const post = await ada.req('POST', '/posts/create', {
    content_type: 'text', caption: 'New preprint on contact-map prediction.', tags: ['#Bioinformatics', 'proteins']
  });
  assert(post.status === 201 && post.data.username === adaName && post.data.tags.includes('bioinformatics'),
    'create post (tags normalised, author joined)', post.json);
  const postId = post.data.id;

  const empty = await ada.req('POST', '/posts/create', { content_type: 'text', caption: '' });
  assert(empty.status === 400, 'empty post rejected');

  const followingFeed = await ben.req('GET', '/posts/feed?scope=following');
  assert(followingFeed.data.some((p) => p.id === postId), 'following feed shows followed author', followingFeed.data);

  const react = await ben.req('POST', '/posts/react', { post_id: postId, reaction_type: 'novel' });
  assert(react.status === 200 && react.data.reaction_count === 1 && react.data.viewer_reaction === 'novel', 'react', react.json);
  const react2 = await ben.req('POST', '/posts/react', { post_id: postId, reaction_type: 'interesting' });
  assert(react2.data.reaction_count === 1, 'changing reaction does not double count', react2.json);

  const cmt = await ben.req('POST', `/posts/${postId}/comments`, { content: 'Which dataset did you use?' });
  assert(cmt.status === 201 && cmt.data.username === benName, 'comment', cmt.json);
  const cmts = await new Client().req('GET', `/posts/${postId}/comments`);
  assert(cmts.data.length === 1, 'comments are public');

  const save = await ben.req('POST', `/posts/${postId}/bookmark`);
  assert(save.status === 200 && save.data.is_bookmarked, 'bookmark', save.json);
  const saved = await ben.req('GET', '/posts/saved');
  assert(saved.data.length === 1 && saved.data[0].id === postId && saved.data[0].is_bookmarked && saved.data[0].saved_at,
    'saved list', saved.data);

  const single = await ben.req('GET', `/posts/${postId}`);
  assert(single.data.viewer_reaction === 'interesting' && single.data.comment_count === 1 && single.data.is_bookmarked,
    'single post carries viewer state', single.data);

  const trending = await ben.req('GET', '/posts/trending');
  assert(trending.data.some((p) => p.id === postId), 'trending', trending.data);
  const tags = await new Client().req('GET', '/posts/tags/trending');
  assert(tags.data.some((t) => t.tag === 'bioinformatics'), 'trending tags', tags.data);
  const byTag = await new Client().req('GET', '/posts/feed?tag=proteins');
  assert(byTag.data.some((p) => p.id === postId), 'feed filtered by tag');

  const userPosts = await new Client().req('GET', `/users/${adaName}/posts`);
  assert(userPosts.data.length === 1, 'profile posts');

  const notes = await waitFor(async () => {
    const n = await ada.req('GET', '/notifications');
    return n.data.length >= 3 ? n : null;
  }, 'ada gets follow/reaction/comment notifications');
  const types = notes.data.map((n) => n.type).sort();
  assert(['comment', 'follow', 'reaction'].every((t) => types.includes(t)) && notes.json.unreadCount >= 3, 'notification types', notes.json);
  await ada.req('POST', '/notifications/read-all');
  const unread = await ada.req('GET', '/notifications/unread-count');
  assert(unread.data.count === 0, 'mark all notifications read');

  // --- Stories ----------------------------------------------------------
  const story = await ada.req('POST', '/stories', { text: 'Submitting to RECOMB tonight.', gradient: 'from-indigo-500 to-purple-600' });
  assert(story.status === 201, 'post a story', story.json);
  const benStories = await ben.req('GET', '/stories');
  assert(benStories.data.some((s) => s.id === story.data.id && !s.viewed), 'followers see stories', benStories.data);
  await ben.req('POST', `/stories/${story.data.id}/view`);
  const after = await ben.req('GET', '/stories');
  assert(after.data.find((s) => s.id === story.data.id).viewed, 'story marked viewed');

  // --- Direct messages: REST + Socket.IO ----------------------------------
  const conv = await ben.req('POST', '/messages/conversations', { username: adaName });
  assert([200, 201].includes(conv.status) && conv.data.participants[0].username === adaName, 'start DM', conv.json);
  const again = await ben.req('POST', '/messages/conversations', { username: adaName });
  assert(again.data.id === conv.data.id, 'starting a DM twice reuses the conversation');

  const anon = io(ORIGIN, { transports: ['websocket'], reconnection: false });
  const anonErr = await new Promise((r) => { anon.on('connect_error', (e) => r(e.message)); anon.on('connect', () => r('connected')); });
  anon.close();
  assert(anonErr === 'unauthorized', 'socket rejects unauthenticated clients', anonErr);

  const sock = io(ORIGIN, { transports: ['websocket'], reconnection: false, extraHeaders: { Cookie: ada.cookieHeader() } });
  await new Promise((r, j) => { sock.on('connect', r); sock.on('connect_error', j); });
  const joined = await new Promise((r) => sock.emit('join_room', conv.data.id, r));
  assert(joined.ok, 'participant can join conversation room');
  const intruder = await new Promise((r) => sock.emit('join_room', '00000000-0000-0000-0000-000000000000', r));
  assert(!intruder.ok, 'cannot join a conversation you are not in');

  const delivered = new Promise((r) => sock.on('receive_message', r));
  const sent = await ben.req('POST', '/messages/send', { conversationId: conv.data.id, content: 'Loved the preprint!' });
  assert(sent.status === 201 && sent.data.username === benName, 'send message', sent.json);
  const live = await Promise.race([delivered, new Promise((r) => setTimeout(() => r(null), 3000))]);
  assert(live && live.content === 'Loved the preprint!', 'message delivered live over socket', live);
  sock.close();

  const inbox = await ada.req('GET', '/messages/conversations');
  assert(inbox.data[0].unread_count === 1 && inbox.data[0].last_message === 'Loved the preprint!', 'inbox unread count', inbox.data);
  const thread = await ada.req('GET', `/messages/${conv.data.id}/messages`);
  assert(thread.data.messages.length === 1, 'message history');
  await ada.req('POST', '/messages/read', { conversationId: conv.data.id });
  const inbox2 = await ada.req('GET', '/messages/conversations');
  assert(inbox2.data[0].unread_count === 0, 'mark conversation read');
  const outsider = await new Client().req('GET', `/messages/${conv.data.id}/messages`);
  assert(outsider.status === 401, 'messages require auth');

  // --- Documents --------------------------------------------------------
  const samplePdf = path.join(__dirname, '../research_rag/data/raw_papers/06-028.pdf');
  if (fs.existsSync(samplePdf)) {
    const form = new FormData();
    form.append('file', new Blob([fs.readFileSync(samplePdf)], { type: 'application/pdf' }), 'protein-function.pdf');
    const up = await ada.req('POST', '/assets/upload', form);
    assert(up.status === 201 && up.data.status === 'processing', 'upload PDF', up.json);
    const ready = await waitFor(async () => {
      const d = await ada.req('GET', `/assets/${up.data.id}`);
      return d.data && d.data.status === 'ready' ? d : null;
    }, 'document processed to ready');
    assert(ready.data.abstract && ready.data.abstract.length > 100 && ready.data.metadata.pages > 0, 'abstract + page count extracted', ready.data);
    const file = await fetch(ready.data.file_url);
    assert(file.ok && (file.headers.get('content-type') || '').includes('pdf'), 'uploaded file is served');
    const peek = await ben.req('GET', `/assets/${up.data.id}`);
    assert(peek.status === 404, 'private documents are not visible to others');
    const badType = new FormData();
    badType.append('file', new Blob(['hello'], { type: 'text/plain' }), 'notes.txt');
    const rej = await ada.req('POST', '/assets/upload', badType);
    assert(rej.status === 400, 'non-paper uploads rejected', rej.json);

    const attach = await ben.req('POST', '/posts/create', { content_type: 'document', caption: 'mine now', document_id: up.data.id });
    assert(attach.status === 403, "cannot attach someone else's paper to a post", attach.json);
  }

  // --- Projects & tasks -------------------------------------------------
  const proj = await ada.req('POST', '/projects', { name: 'Contact maps v2', description: 'Follow-up study' });
  assert(proj.status === 201, 'create project', proj.json);
  const task = await ada.req('POST', `/projects/${proj.data.id}/tasks`, { title: 'Rerun ablations', priority: 'high' });
  assert(task.status === 201 && task.data.status === 'todo', 'create task', task.json);
  const moved = await ada.req('PUT', `/projects/tasks/${task.data.id}`, { status: 'in_progress' });
  assert(moved.data.status === 'in_progress', 'move task', moved.json);
  const peekProj = await ben.req('GET', `/projects/${proj.data.id}/tasks`);
  assert(peekProj.status === 403, 'non-members cannot read project tasks', peekProj.json);

  const ws = await ada.req('POST', '/workspaces', { name: 'Lab workspace' });
  assert(ws.status === 201, 'create workspace', ws.json);
  const wsList = await ada.req('GET', '/workspaces');
  assert(wsList.data.length === 1, 'list workspaces');

  // --- Reels, leaderboard, achievements ----------------------------------
  const reels = await new Client().req('GET', '/reels/feed');
  assert(reels.status === 200 && Array.isArray(reels.data), 'public reels feed', reels.json);
  const board = await new Client().req('GET', '/users/leaderboard?period=week');
  assert(board.data.some((r) => r.username === adaName && r.rank >= 1 && r.score > 0), 'leaderboard from real activity', board.data);
  const ach = await ada.req('GET', '/users/me/achievements');
  assert(ach.data.achievements.find((a) => a.id === 'first_post').unlocked, 'achievements derived from activity', ach.data);

  // --- Logout -----------------------------------------------------------
  const stale = ada.cookieHeader();
  const out = await ada.req('POST', '/auth/logout');
  assert(out.status === 200, 'logout');
  const reuse = await new Client().req('GET', '/users/me', null, { headers: { Cookie: stale } });
  assert(reuse.status === 401, 'session revoked after logout', reuse.json);

  console.log(`\nAll ${passed} checks passed.`);
  await redis.quit();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
