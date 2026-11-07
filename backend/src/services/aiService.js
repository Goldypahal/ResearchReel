const db = require('../config/db');
const { generate, isConfigured } = require('./ai/llm');
const ragClient = require('./rag/ragClient');

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

const getOrCreateConversation = async (userId, conversationId, documentIds, firstQuestion) => {
  if (conversationId) {
    const r = await db.query('SELECT * FROM ai_conversations WHERE id = $1 AND user_id = $2', [conversationId, userId]);
    if (r.rows[0]) {
      if (documentIds.length) {
        const u = await db.query(
          'UPDATE ai_conversations SET document_ids = $2, document_id = $3 WHERE id = $1 RETURNING *',
          [conversationId, documentIds, documentIds[0]]
        );
        return u.rows[0];
      }
      return r.rows[0];
    }
  }
  const title = String(firstQuestion).replace(/\s+/g, ' ').slice(0, 80);
  const r = await db.query(
    'INSERT INTO ai_conversations (user_id, document_id, document_ids, title) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, documentIds[0] || null, documentIds, title || 'New conversation']
  );
  return r.rows[0];
};

const loadDocuments = async (ids) => {
  if (!ids.length) return [];
  const r = await db.query(
    `SELECT id, COALESCE(title, file_name) AS title, abstract, summary_text, extracted_text, authors, doi, rag_status
       FROM documents WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`,
    [ids]
  );
  const byId = new Map(r.rows.map((d) => [d.id, d]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
};

/** Full-text context for one or more papers, sharing the context budget between them. */
const multiDocumentContext = (docs) => {
  if (docs.length === 1) return documentContext(docs[0]);
  const budget = Math.floor(MAX_CONTEXT_CHARS / docs.length);
  return docs.map((d, i) => `[Paper ${i + 1}] ${documentContext({ ...d, extracted_text: (d.extracted_text || '').slice(0, budget) })}`).join('\n\n');
};

/**
 * Turns a follow-up ("what about the second paper?") into a standalone question,
 * because the retrieval service sees one question at a time.
 */
const standaloneQuestion = async (question, history) => {
  if (!history.length || !isConfigured()) return question;
  try {
    const transcript = history.slice(-4).map((h) => `${h.role === 'model' ? 'Assistant' : 'User'}: ${h.text.slice(0, 1500)}`).join('\n');
    const out = await generate(
      `Rewrite the user's latest question so it can be understood without the conversation. Keep names, methods and
numbers. If it is already self-contained, return it unchanged. Reply with the question only.

Conversation:
${transcript}

Latest question: ${question}`,
      { temperature: 0, timeoutMs: 20000 }
    );
    const text = String(out || '').trim().replace(/^"|"$/g, '');
    return text && text.length <= 2000 ? text : question;
  } catch (err) {
    return question;
  }
};

/** Asks the Research RAG service; returns null when it is unavailable so the caller can fall back. */
const askWithRag = async (question, docs, history) => {
  if (!ragClient.isConfigured()) return null;
  const ready = docs.filter((d) => d.rag_status === 'ready');
  if (!ready.length) return null;
  try {
    const result = await ragClient.query({ question: await standaloneQuestion(question, history), paperIds: ready.map((d) => d.id) });
    const titles = new Map(docs.map((d) => [d.id, d.title]));
    const sources = (result.citations || []).map((c) => ({
      number: c.number,
      documentId: c.paper_id,
      title: titles.get(c.paper_id) || c.title || 'Paper',
      page: c.page_start ?? null,
      section: c.section || null,
      quote: c.quote ? String(c.quote).slice(0, 400) : null
    }));
    // Papers that were selected but contributed no citation still appear as sources.
    for (const d of ready) {
      if (!sources.some((s) => s.documentId === d.id)) sources.push({ documentId: d.id, title: d.title });
    }
    const pending = docs.filter((d) => d.rag_status !== 'ready');
    return {
      answer: result.answer,
      sources,
      mode: 'rag',
      notice: pending.length
        ? `${pending.length === 1 ? `"${pending[0].title}" is` : `${pending.length} papers are`} not indexed yet and ${pending.length === 1 ? 'was' : 'were'} not searched.`
        : null
    };
  } catch (err) {
    console.error(`[AI] RAG query failed, falling back to full text: ${err.message}`);
    return { failed: true };
  }
};

/**
 * Answers a question, optionally grounded in one or more papers, and stores the exchange.
 * With the Research RAG service, answers come from the most relevant passages and carry
 * page-level citations; otherwise the papers' full text is sent to the model.
 */
const ask = async ({ userId, question, documentIds = [], conversationId }) => {
  const convo = await getOrCreateConversation(userId, conversationId, documentIds, question);
  const effectiveIds = documentIds.length ? documentIds : (convo.document_ids?.length ? convo.document_ids : (convo.document_id ? [convo.document_id] : []));

  const historyRes = await db.query(
    'SELECT role, content FROM ai_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 12',
    [convo.id]
  );
  const history = historyRes.rows.reverse().map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.content }));

  const docs = await loadDocuments(effectiveIds);
  let result = docs.length ? await askWithRag(question, docs, history) : null;
  const ragFailed = Boolean(result?.failed);
  if (ragFailed) result = null;

  if (!result) {
    if (!isConfigured()) {
      const e = new Error(ragFailed
        ? 'Paper search is temporarily unavailable. Please try again in a minute.'
        : docs.length
          ? 'These papers are still being indexed. Please try again in a minute.'
          : 'AI features are not enabled on this server yet.');
      e.statusCode = 503; e.code = 'AI_UNAVAILABLE';
      throw e;
    }
    const prompt = docs.length ? `${multiDocumentContext(docs)}\n\nQuestion: ${question}` : question;
    const answer = await generate(prompt, { system: SYSTEM_PROMPT, history });
    result = { answer, sources: docs.map((d) => ({ documentId: d.id, title: d.title })), mode: docs.length ? 'full_text' : 'general', notice: null };
  }

  await db.query(`INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1, 'user', $2)`, [convo.id, question]);
  await db.query(
    `INSERT INTO ai_messages (conversation_id, role, content, sources, created_at) VALUES ($1, 'assistant', $2, $3, NOW() + interval '1 millisecond')`,
    [convo.id, result.answer, JSON.stringify(result.sources)]
  );
  await db.query('UPDATE ai_conversations SET updated_at = NOW() WHERE id = $1', [convo.id]);

  return { ...result, conversation_id: convo.id };
};

const TOOL_LABELS = {
  compare: 'Comparison',
  review: 'Literature review',
  gaps: 'Research gaps',
  contradictions: 'Contradictions',
  timeline: 'Timeline'
};

/** Runs one of the multi-paper research tools on papers that are indexed. */
const runResearchTool = async ({ tool, documentIds }) => {
  const spec = ragClient.TOOLS[tool];
  if (!spec) {
    const e = new Error('Unknown research tool.'); e.statusCode = 400; e.code = 'VALIDATION_ERROR'; throw e;
  }
  if (!ragClient.isConfigured()) {
    const e = new Error('Research tools are not enabled on this server.'); e.statusCode = 503; e.code = 'RAG_UNAVAILABLE'; throw e;
  }
  const docs = await loadDocuments(documentIds);
  const ready = docs.filter((d) => d.rag_status === 'ready');
  if (ready.length < spec.minPapers) {
    const e = new Error(ready.length < docs.length
      ? 'Some selected papers are still being indexed. Please try again shortly.'
      : `Select at least ${spec.minPapers} paper${spec.minPapers > 1 ? 's' : ''}.`);
    e.statusCode = 409; e.code = 'NOT_INDEXED'; throw e;
  }
  try {
    const out = await ragClient.runTool(tool, ready.map((d) => d.id));
    return {
      tool,
      title: TOOL_LABELS[tool],
      result: out.result,
      papers: ready.map((d) => ({ id: d.id, title: d.title })),
      skipped: docs.filter((d) => d.rag_status !== 'ready').map((d) => ({ id: d.id, title: d.title }))
    };
  } catch (err) {
    const e = new Error(err.status === 409 ? 'Some selected papers are not indexed yet.' : 'The research service could not complete this request. Please try again.');
    e.statusCode = err.status === 409 ? 409 : 502; e.code = 'RAG_ERROR';
    throw e;
  }
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

module.exports = { summarizeDocument, ask, runResearchTool, getRecommendations, isConfigured };
