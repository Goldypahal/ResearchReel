const db = require('../config/db');
const { generate, isConfigured } = require('./ai/llm');

const MAX_CONTEXT_CHARS = 120000;

const SYSTEM_PROMPT = `You are ResearchReel's research assistant. You help students and researchers understand papers,
methods and scientific concepts. Be accurate and concise, use Markdown for structure, and say plainly when you are not sure.
When a paper is provided, ground your answer in it and cite page numbers like (p. 3) when the text shows them.
Never fabricate citations, results or quotes.`;

const loadDocument = async (documentId) => {
  const r = await db.query(
    `SELECT id, COALESCE(title, file_name) AS title, abstract, summary_text, key_points, extracted_text, authors, doi
       FROM documents WHERE id = $1 AND deleted_at IS NULL`,
    [documentId]
  );
  return r.rows[0] || null;
};

const documentContext = (doc) => {
  const text = (doc.extracted_text || '').slice(0, MAX_CONTEXT_CHARS);
  return `Paper: "${doc.title}"${doc.authors?.length ? ` by ${doc.authors.join(', ')}` : ''}${doc.doi ? ` (DOI ${doc.doi})` : ''}
Abstract: ${doc.abstract || doc.summary_text || '(not available)'}
Full text:
"""
${text || '(No extractable text — the PDF may be scanned images.)'}
"""`;
};

/**
 * Summarises a document from its extracted text and stores the result.
 */
const summarizeDocument = async (documentId) => {
  const doc = await loadDocument(documentId);
  if (!doc) {
    const e = new Error('Document not found.');
    e.statusCode = 404; e.code = 'NOT_FOUND';
    throw e;
  }
  if (!doc.extracted_text && !doc.abstract) {
    const e = new Error('This document has no readable text to summarise (it may be a scanned PDF).');
    e.statusCode = 422; e.code = 'NO_TEXT';
    throw e;
  }
  const result = await generate(
    `Summarise this research paper. Return JSON: {"abstract": "<a clear 3-5 sentence plain-language summary>",
"key_points": ["<4-6 short bullet points of the main contributions/findings>"]}.
${documentContext(doc)}`,
    { json: true, system: SYSTEM_PROMPT }
  );
  const abstract = String(result.abstract || '').trim();
  const keyPoints = Array.isArray(result.key_points) ? result.key_points.map((k) => String(k).trim()).filter(Boolean).slice(0, 8) : [];
  await db.query('UPDATE documents SET summary_text = $1, key_points = $2, updated_at = NOW() WHERE id = $3', [abstract, keyPoints, documentId]);
  return { abstract, key_points: keyPoints };
};

const getOrCreateConversation = async (userId, conversationId, documentId, firstQuestion) => {
  if (conversationId) {
    const r = await db.query('SELECT * FROM ai_conversations WHERE id = $1 AND user_id = $2', [conversationId, userId]);
    if (r.rows[0]) return r.rows[0];
  }
  const title = String(firstQuestion).replace(/\s+/g, ' ').slice(0, 80);
  const r = await db.query(
    'INSERT INTO ai_conversations (user_id, document_id, title) VALUES ($1, $2, $3) RETURNING *',
    [userId, documentId || null, title || 'New conversation']
  );
  return r.rows[0];
};

/**
 * Answers a question, optionally grounded in a document, and stores the exchange.
 */
const ask = async ({ userId, question, documentId, conversationId }) => {
  const convo = await getOrCreateConversation(userId, conversationId, documentId, question);
  const effectiveDocId = documentId || convo.document_id;

  const historyRes = await db.query(
    'SELECT role, content FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 12',
    [convo.id]
  );
  const history = historyRes.rows.reverse().map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.content }));

  let prompt = question;
  let sources = [];
  if (effectiveDocId) {
    const doc = await loadDocument(effectiveDocId);
    if (doc) {
      prompt = `${documentContext(doc)}\n\nQuestion: ${question}`;
      sources = [{ documentId: doc.id, title: doc.title }];
    }
  }

  const answer = await generate(prompt, { system: SYSTEM_PROMPT, history });

  await db.query(
    `INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1, 'user', $2), ($1, 'assistant', $3)`,
    [convo.id, question, answer]
  );
  await db.query('UPDATE ai_conversations SET updated_at = NOW() WHERE id = $1', [convo.id]);
  // Store sources on the assistant message we just inserted.
  if (sources.length) {
    await db.query(
      `UPDATE ai_messages SET sources = $1 WHERE id = (
         SELECT id FROM ai_messages WHERE conversation_id = $2 AND role = 'assistant' ORDER BY created_at DESC LIMIT 1)`,
      [JSON.stringify(sources), convo.id]
    );
  }

  return { answer, sources, conversation_id: convo.id };
};

/**
 * Recommends public papers that overlap with the user's research interests and
 * the tags of papers they have saved or uploaded. Pure SQL, no AI needed.
 */
const getRecommendations = async ({ userId, query, limit = 10 }) => {
  const params = [userId || null, limit];
  let textFilter = '';
  if (query) {
    params.push(`%${query}%`);
    textFilter = `AND (COALESCE(d.title, d.file_name) ILIKE $3 OR d.abstract ILIKE $3 OR array_to_string(d.tags, ' ') ILIKE $3)`;
  }
  const r = await db.query(
    `WITH me AS (SELECT research_interests FROM users WHERE id = $1::uuid)
     SELECT d.id, COALESCE(d.title, d.file_name) AS title, d.abstract, d.summary_text, d.authors, d.doi,
            d.publication_year, d.journal, d.tags, d.created_at,
            u.username AS uploader_username, u.full_name AS uploader_name,
            COALESCE(cardinality(ARRAY(
              SELECT lower(unnest(d.tags)) INTERSECT SELECT lower(unnest((SELECT research_interests FROM me)))
            )), 0) AS score
       FROM documents d JOIN users u ON u.id = d.uploader_id
      WHERE d.deleted_at IS NULL AND d.visibility = 'public'
        AND ($1::uuid IS NULL OR d.uploader_id <> $1::uuid) ${textFilter}
      ORDER BY score DESC, d.created_at DESC
      LIMIT $2`,
    params
  );
  return r.rows;
};

module.exports = { summarizeDocument, ask, getRecommendations, isConfigured };
