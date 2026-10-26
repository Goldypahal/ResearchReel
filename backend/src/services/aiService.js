const ragService = require('./ai/ragService');
const gemini = require('./ai/geminiClient');
const documentRepository = require('../repositories/documentRepository');
const db = require('../config/db');
const { AppError } = require('../utils/errors');

const unavailable = (detail) =>
  new AppError(detail || 'AI features are temporarily unavailable. Please try again shortly.', 503, 'AI_UNAVAILABLE');

const TEXT_WINDOW = 24000;

/** Pulls `{ abstract, key_points }` out of a model answer, tolerating light formatting. */
const parseSummary = (answer) => {
  const lines = String(answer || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^([-*•]|\d+[.)])\s+/.test(l)).map((l) => l.replace(/^([-*•]|\d+[.)])\s+/, ''));
  const prose = lines.filter((l) => !/^([-*•]|\d+[.)])\s+/.test(l) && !/^#+\s|^\*\*.*\*\*$/.test(l));
  return { abstract: prose.join(' ').slice(0, 1500), key_points: bullets.slice(0, 5) };
};

/**
 * Summarise a paper. Uses the RAG index when the paper is in it, otherwise
 * Gemini over the stored extracted text. Throws 503 rather than returning a
 * placeholder, so nothing fake is ever saved as a paper's summary.
 */
const summarizeDocument = async (documentId) => {
  const doc = await documentRepository.findWithText(documentId);
  if (!doc) throw new AppError('Document not found.', 404, 'NOT_FOUND');
  if (doc.status === 'processing') throw new AppError('This paper is still being processed.', 409, 'NOT_READY');

  if (doc.rag_indexed_at && ragService.isConfigured()) {
    try {
      const result = await ragService.summarize(documentId);
      const parsed = parseSummary(result.answer);
      if (parsed.abstract || parsed.key_points.length) return { ...parsed, source: 'rag' };
    } catch (err) {
      console.warn(`[AI] RAG summarize failed for ${documentId}: ${err.message}`);
    }
  }

  if (!doc.extracted_text) {
    throw new AppError('No text could be extracted from this paper, so it cannot be summarised.', 422, 'NO_TEXT');
  }
  if (!gemini.isConfigured()) throw unavailable('AI summaries are not configured on this server.');

  try {
    const out = await gemini.generateText(
      `Summarise this research paper for researchers in adjacent fields.
Return JSON: {"abstract": "<3-5 sentence plain-language summary>", "key_points": ["<finding>", ...3 to 5 items]}.
Only use information in the text. Do not invent results or numbers.

Title: ${doc.title}
Text:
"""${doc.extracted_text.slice(0, TEXT_WINDOW)}"""`,
      { json: true }
    );
    const abstract = String(out.abstract || '').trim();
    const keyPoints = (Array.isArray(out.key_points) ? out.key_points : []).map(String).filter(Boolean).slice(0, 5);
    if (!abstract) throw new Error('empty summary');
    return { abstract, key_points: keyPoints, source: 'gemini' };
  } catch (err) {
    console.error(`[AI] summarize failed for ${documentId}: ${err.message}`);
    throw unavailable();
  }
};

/**
 * Answer a question about one paper (document_id) or the user's library.
 * RAG first (cited chunks); for a single paper, fall back to Gemini over its text.
 */
const askGemini = async ({ document_id, question }) => {
  const scoped = document_id && document_id !== 'global' ? document_id : null;

  if (ragService.isConfigured()) {
    try {
      const result = await ragService.query(question, scoped ? [scoped] : []);
      return {
        answer: result.answer,
        citations: (result.chunks || []).map((chunk) => ({
          page: chunk.metadata?.page ?? null,
          section: chunk.metadata?.section || null,
          text: String(chunk.content || '').slice(0, 220),
        })),
        latency: result.latency,
        source: 'rag',
      };
    } catch (err) {
      console.warn(`[AI] RAG query failed: ${err.message}`);
    }
  }

  if (scoped && gemini.isConfigured()) {
    const doc = await documentRepository.findWithText(scoped);
    if (doc?.extracted_text) {
      try {
        const answer = await gemini.generateText(
          `Answer the question using only the paper below. If the paper does not contain the answer, say so plainly.
Quote short phrases from the paper where helpful.

Title: ${doc.title}
Paper:
"""${doc.extracted_text.slice(0, TEXT_WINDOW)}"""

Question: ${question}`
        );
        return { answer, citations: [], source: 'gemini' };
      } catch (err) {
        console.error(`[AI] Gemini Q&A failed: ${err.message}`);
      }
    }
  }
  throw unavailable();
};

/**
 * Papers shared on ResearchReel that match the viewer's research interests and
 * the tags of posts they've reacted to or saved. Excludes their own uploads.
 */
const getRecommendations = async ({ user_id, limit = 6 }) => {
  const max = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 20);
  const { rows } = await db.query(
    `WITH interests AS (
       SELECT lower(unnest(COALESCE(research_interests, '{}'))) AS tag FROM users WHERE id = $1
       UNION
       SELECT lower(unnest(COALESCE(p.tags, '{}'))) FROM posts p
         WHERE p.id IN (SELECT post_id FROM reactions WHERE user_id = $1
                        UNION SELECT post_id FROM bookmarks WHERE user_id = $1)
     ),
     candidates AS (
       SELECT DISTINCT ON (d.id)
              d.id AS document_id, d.title, d.doi, d.publication_year, d.journal, d.abstract,
              p.id AS post_id, p.tags, p.created_at,
              u.username, u.full_name, u.avatar_url, u.institution,
              (SELECT COUNT(*) FROM unnest(COALESCE(p.tags, '{}')) t WHERE lower(t) IN (SELECT tag FROM interests))::int AS matched,
              (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id)::int AS reactions
       FROM posts p
       JOIN documents d ON d.id = p.document_id AND d.deleted_at IS NULL
       JOIN users u ON u.id = p.author_id
       WHERE p.deleted_at IS NULL AND p.author_id <> $1
       ORDER BY d.id, p.created_at DESC
     )
     SELECT * FROM candidates
     ORDER BY matched DESC, reactions DESC, created_at DESC
     LIMIT $2`,
    [user_id, max]
  );
  return rows.map(({ matched, abstract, ...r }) => ({
    ...r,
    abstract: abstract ? String(abstract).slice(0, 300) : null,
    reason: matched > 0
      ? `Matches your interest in ${(r.tags || []).slice(0, 2).map((t) => `#${t}`).join(', ')}`
      : 'Popular in the community',
  }));
};

module.exports = {
  summarizeDocument,
  askGemini,
  getRecommendations,
};
