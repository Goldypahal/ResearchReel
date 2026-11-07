/**
 * Cross-user authorization: for every endpoint that takes an object id, a
 * second signed-in user must not be able to read or change the first user's
 * private objects. Runs against real Postgres and Redis.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { request, app, db, connect, close, signedInUser } = require('./helpers');
const { uploadsRoot } = require('../../src/services/documentProcessor');
const { accessibleIndexedDocumentIds } = require('../../src/authorization/documentAuthorization');
const { verify } = require('../../src/utils/fileAccess');

beforeAll(connect);
afterAll(close);

/** A paper owned by `owner`, with a real file on disk under uploads/documents. */
const makePaper = async (owner, { visibility = 'private', title, indexed = true } = {}) => {
  const storedName = `${crypto.randomUUID()}.pdf`;
  const storageKey = `documents/${owner.id}/${storedName}`;
  fs.mkdirSync(path.join(uploadsRoot, 'documents', owner.id), { recursive: true });
  fs.writeFileSync(path.join(uploadsRoot, storageKey), '%PDF-1.4 test paper');
  const { rows } = await db.query(
    `INSERT INTO documents (uploader_id, title, file_name, file_type, file_url, storage_key, file_size, status, visibility,
                            extracted_text, rag_indexed_at)
     VALUES ($1, $2, 'paper.pdf', 'application/pdf', $3, $4, 20, 'ready', $5, 'Some extracted text', $6) RETURNING id`,
    [owner.id, title || `Paper ${storedName.slice(0, 8)}`, `http://api.test/uploads/${storageKey}`, storageKey, visibility,
      indexed ? new Date() : null]
  );
  return { id: rows[0].id, storageKey };
};

/** Path + query of a signed link, for requesting it from the in-process app. */
const localPath = (url) => url.replace('http://api.test', '');

describe('cross-user authorization (real Postgres)', () => {
  let owner;
  let stranger;
  let viewer;
  let paper;

  beforeAll(async () => {
    owner = await signedInUser({ name: 'Paper Owner' });
    stranger = await signedInUser({ name: 'Stranger' });
    viewer = await signedInUser({ name: 'Project Viewer' });
    paper = await makePaper(owner, { title: 'Unpublished results on zebrafish regeneration' });
  });

  describe('papers and their files', () => {
    it('hides a private paper from other users', async () => {
      expect((await stranger.agent.get(`/api/v1/assets/${paper.id}`)).status).toBe(404);
      expect((await stranger.agent.patch(`/api/v1/assets/${paper.id}`).send({ visibility: 'public' })).status).toBe(404);
      expect((await stranger.agent.delete(`/api/v1/assets/${paper.id}`)).status).toBe(404);
      const still = await db.query('SELECT visibility, deleted_at FROM documents WHERE id = $1', [paper.id]);
      expect(still.rows[0]).toMatchObject({ visibility: 'private', deleted_at: null });
    });

    it('serves the file only through a signed, expiring link', async () => {
      const res = await owner.agent.get(`/api/v1/assets/${paper.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.storage_key).toBeUndefined();
      const signed = res.body.data.file_url;
      expect(signed).toMatch(/\?exp=\d+&sig=/);

      expect((await request(app).get(localPath(signed))).status).toBe(200);
      // The stored, unsigned URL no longer works, nor does a forged or altered signature.
      expect((await request(app).get(`/uploads/${paper.storageKey}`)).status).toBe(404);
      expect((await request(app).get(localPath(signed).replace(/sig=[^&]+/, 'sig=forged'))).status).toBe(404);
      const otherKey = `documents/${owner.id}/${crypto.randomUUID()}.pdf`;
      expect((await request(app).get(localPath(signed).replace(paper.storageKey, otherKey))).status).toBe(404);
      // Expired links are refused.
      const sig = new URL(signed).searchParams.get('sig');
      const exp = Number(new URL(signed).searchParams.get('exp'));
      expect(verify(paper.storageKey, exp, sig, (exp + 1) * 1000)).toBe(false);
    });

    it('keeps the library list and feed links signed', async () => {
      const list = await owner.agent.get('/api/v1/assets');
      const mine = list.body.data.find((d) => d.id === paper.id);
      expect(mine.file_url).toMatch(/sig=/);
    });

    it('refuses AI features on someone else’s private paper', async () => {
      for (const [url, body] of [
        ['/api/v1/ai/summarize', { document_id: paper.id }],
        ['/api/v1/ai/ask-gemini', { document_id: paper.id, question: 'What did they find?' }],
        ['/api/v1/ai/script', { documentId: paper.id }],
      ]) {
        const res = await stranger.agent.post(url).send(body);
        expect([url, res.status]).toEqual([url, 403]);
      }
      const draft = await stranger.agent.post('/api/v1/reels/generate-draft').send({ document_id: paper.id });
      expect([403, 404]).toContain(draft.status);
    });

    it('scopes "ask across all papers" to papers the asker can read', async () => {
      const publicPaper = await makePaper(owner, { visibility: 'public' });
      const strangersOwn = await makePaper(stranger);
      const ids = await accessibleIndexedDocumentIds(stranger.id);
      expect(ids).toContain(publicPaper.id);
      expect(ids).toContain(strangersOwn.id);
      expect(ids).not.toContain(paper.id);
      expect(await accessibleIndexedDocumentIds(owner.id)).toContain(paper.id);
    });

    it('keeps private papers out of search', async () => {
      const res = await stranger.agent.get('/api/v1/search/documents').query({ q: 'zebrafish', type: 'document' });
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body.data)).not.toContain(paper.id);
      const mine = await owner.agent.get('/api/v1/search/documents').query({ q: 'zebrafish', type: 'document' });
      expect(JSON.stringify(mine.body.data)).toContain(paper.id);
    });

    it('cuts off access when the owner makes a paper private again', async () => {
      const p = await makePaper(owner, { visibility: 'public' });
      expect((await stranger.agent.get(`/api/v1/assets/${p.id}`)).status).toBe(200);
      await owner.agent.patch(`/api/v1/assets/${p.id}`).send({ visibility: 'private' }).expect(200);
      expect((await stranger.agent.get(`/api/v1/assets/${p.id}`)).status).toBe(404);
    });

    it('keeps version history private even on public papers', async () => {
      const p = await makePaper(owner, { visibility: 'public' });
      expect((await stranger.agent.get(`/api/v1/projects/document/${p.id}/versions`)).status).toBe(403);
      expect((await stranger.agent.post('/api/v1/projects/document/version/create').send({ document_id: p.id, content: 'x' })).status).toBe(403);
      expect((await owner.agent.get(`/api/v1/projects/document/${p.id}/versions`)).status).toBe(200);
    });
  });

  describe('projects', () => {
    let projectId;
    let taskId;

    beforeAll(async () => {
      const created = await owner.agent.post('/api/v1/projects').send({ name: 'Regeneration study' });
      projectId = created.body.data.id;
      await owner.agent.post(`/api/v1/projects/${projectId}/members`).send({ username: viewer.username, role: 'viewer' }).expect(201);
      await owner.agent.post(`/api/v1/projects/${projectId}/papers`).send({ document_id: paper.id }).expect(201);
      const task = await owner.agent.post(`/api/v1/projects/${projectId}/tasks`).send({ title: 'Draft methods' });
      taskId = task.body.data.id;
    });

    it('locks non-members out of every project endpoint', async () => {
      const a = stranger.agent;
      const statuses = [
        (await a.get(`/api/v1/projects/${projectId}`)).status,
        (await a.patch(`/api/v1/projects/${projectId}`).send({ name: 'Mine now' })).status,
        (await a.delete(`/api/v1/projects/${projectId}`)).status,
        (await a.post(`/api/v1/projects/${projectId}/members`).send({ username: stranger.username })).status,
        (await a.delete(`/api/v1/projects/${projectId}/members/${viewer.id}`)).status,
        (await a.post(`/api/v1/projects/${projectId}/papers`).send({ document_id: paper.id })).status,
        (await a.delete(`/api/v1/projects/${projectId}/papers/${paper.id}`)).status,
        (await a.get(`/api/v1/projects/${projectId}/tasks`)).status,
        (await a.post(`/api/v1/projects/${projectId}/tasks`).send({ title: 'x' })).status,
        (await a.put(`/api/v1/projects/tasks/${taskId}`).send({ status: 'done' })).status,
        (await a.delete(`/api/v1/projects/tasks/${taskId}`)).status,
      ];
      statuses.forEach((s) => expect([403, 404]).toContain(s));
      const task = await db.query('SELECT status FROM tasks WHERE id = $1', [taskId]);
      expect(task.rows[0].status).toBe('todo');
      const listed = await stranger.agent.get('/api/v1/projects');
      expect(JSON.stringify(listed.body.data)).not.toContain(projectId);
    });

    it('lets a viewer read the project and its papers but not change anything', async () => {
      const a = viewer.agent;
      expect((await a.get(`/api/v1/projects/${projectId}`)).status).toBe(200);
      expect((await a.get(`/api/v1/assets/${paper.id}`)).status).toBe(200);
      expect((await a.patch(`/api/v1/projects/${projectId}`).send({ name: 'x' })).status).toBe(403);
      expect((await a.post(`/api/v1/projects/${projectId}/tasks`).send({ title: 'x' })).status).toBe(403);
      expect((await a.put(`/api/v1/projects/tasks/${taskId}`).send({ status: 'done' })).status).toBe(403);
      expect((await a.post('/api/v1/projects/document/version/create').send({ document_id: paper.id, content: 'x' })).status).toBe(403);
      // Viewers still can't edit the owner's paper record itself.
      expect((await a.patch(`/api/v1/assets/${paper.id}`).send({ title: 'x' })).status).toBe(404);
    });

    it("doesn't turn someone else's public paper into an editable one by adding it to a project", async () => {
      const theirs = await makePaper(owner, { visibility: 'public' });
      const own = await stranger.agent.post('/api/v1/projects').send({ name: 'Reading list' });
      await stranger.agent.post(`/api/v1/projects/${own.body.data.id}/papers`).send({ document_id: theirs.id }).expect(201);
      expect((await stranger.agent.post('/api/v1/projects/document/version/create').send({ document_id: theirs.id, content: 'x' })).status).toBe(403);
      expect((await stranger.agent.get(`/api/v1/projects/document/${theirs.id}/versions`)).status).toBe(403);
    });
  });

  describe('messages', () => {
    let conversationId;

    beforeAll(async () => {
      const res = await owner.agent.post('/api/v1/messages/conversations').send({ username: viewer.username });
      conversationId = res.body.data.id;
      await owner.agent.post('/api/v1/messages/send').send({ conversationId, content: 'Private note' }).expect(201);
    });

    it('keeps outsiders out of a conversation', async () => {
      expect((await stranger.agent.get(`/api/v1/messages/${conversationId}/messages`)).status).toBe(403);
      expect((await stranger.agent.post('/api/v1/messages/send').send({ conversationId, content: 'hi' })).status).toBe(403);
      expect((await stranger.agent.post('/api/v1/messages/read').send({ conversationId })).status).toBe(403);
      const list = await stranger.agent.get('/api/v1/messages/conversations');
      expect(JSON.stringify(list.body.data)).not.toContain(conversationId);
      expect((await viewer.agent.get(`/api/v1/messages/${conversationId}/messages`)).status).toBe(200);
    });

    it('validates what can be sent', async () => {
      const send = (body) => owner.agent.post('/api/v1/messages/send').send({ conversationId, ...body });
      expect((await send({ content: '' })).status).toBe(400);
      expect((await send({ content: 'x'.repeat(4001) })).status).toBe(400);
      expect((await send({ content: 'look', file_url: 'https://evil.example/x.exe' })).status).toBe(400);
      expect((await send({ content: 'look', message_type: 'system' })).status).toBe(400);
      expect((await owner.agent.post('/api/v1/messages/send').send({ conversationId: 'nope', content: 'hi' })).status).toBe(404);
      expect((await owner.agent.get('/api/v1/messages/not-a-uuid/messages')).status).toBe(404);
    });
  });

  describe('everything else that takes an id', () => {
    it('protects posts, stories, notifications, drafts, workspaces and analytics', async () => {
      const post = await db.query(
        "INSERT INTO posts (author_id, content_type, caption) VALUES ($1, 'text', 'Owner post') RETURNING id", [owner.id]);
      expect((await stranger.agent.delete(`/api/v1/posts/${post.rows[0].id}`)).status).toBe(404);

      const story = await owner.agent.post('/api/v1/stories').send({ text: 'Lab day' });
      expect((await stranger.agent.delete(`/api/v1/stories/${story.body.data.id}`)).status).toBe(404);

      await stranger.agent.post(`/api/v1/users/${owner.username}/follow`).expect((r) => expect(r.status).toBeLessThan(300));
      const note = await db.query('SELECT id FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [owner.id]);
      expect(note.rows.length).toBe(1);
      expect((await stranger.agent.post(`/api/v1/notifications/${note.rows[0].id}/read`)).status).toBe(404);

      const draft = await db.query(
        "INSERT INTO reel_drafts (author_id, title, scenes) VALUES ($1, 'Draft', '[]'::jsonb) RETURNING id", [owner.id]);
      const draftId = draft.rows[0].id;
      expect([403, 404]).toContain((await stranger.agent.get(`/api/v1/reels/draft/${draftId}`)).status);
      expect([403, 404]).toContain((await stranger.agent.put(`/api/v1/reels/draft/${draftId}`).send({ title: 'x' })).status);
      expect([403, 404]).toContain((await stranger.agent.delete(`/api/v1/reels/draft/${draftId}`)).status);
      expect([403, 404]).toContain((await stranger.agent.post(`/api/v1/reels/publish-draft/${draftId}`)).status);

      const ws = await owner.agent.post('/api/v1/workspaces').send({ name: 'Owner lab' });
      expect((await stranger.agent.get(`/api/v1/workspaces/${ws.body.data.id}`)).status).toBe(403);
      expect((await stranger.agent.put(`/api/v1/workspaces/${ws.body.data.id}`).send({ name: 'x' })).status).toBe(403);

      expect((await stranger.agent.get(`/api/v1/users/analytics/${owner.id}`)).status).toBe(403);
      expect((await stranger.agent.get('/api/v1/media/jobs/12345')).status).toBe(404);
    });

    it("can't sign another user out", async () => {
      const sessions = await owner.agent.get('/api/v1/auth/sessions');
      const sid = sessions.body.data[0].id;
      await stranger.agent.delete(`/api/v1/auth/sessions/${sid}`);
      expect((await owner.agent.get('/api/v1/users/me')).status).toBe(200);
    });

    it('keeps the shared citation graph admin-only for writes', async () => {
      expect((await stranger.agent.post('/api/v1/citations/paper').send({ doi: '10.1/x', title: 'x' })).status).toBe(403);
      expect((await stranger.agent.post('/api/v1/citations/link').send({ sourceDoi: '10.1/x', targetDoi: '10.1/y' })).status).toBe(403);
    });

    it('answers malformed ids with 4xx, not a server error', async () => {
      expect((await stranger.agent.get('/api/v1/posts/not-a-uuid')).status).toBeLessThan(500);
      expect((await stranger.agent.post('/api/v1/notifications/not-a-uuid/read')).status).toBeLessThan(500);
      expect((await stranger.agent.delete('/api/v1/stories/not-a-uuid')).status).toBeLessThan(500);
    });
  });
});
