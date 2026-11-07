/**
 * HTTP client for the Research RAG service (backend/research_rag).
 *
 * RAG_SERVICE_URL may be a full URL or a bare host:port (as Render's private
 * network provides); RAG_API_KEY must match the service's RAG_API_KEY.
 */

class RagError extends Error {
  constructor(message, { status = null, retryable = false } = {}) {
    super(message);
    this.name = 'RagError';
    this.status = status;
    this.retryable = retryable;
  }
}

const baseUrl = () => {
  const raw = (process.env.RAG_SERVICE_URL || '').trim().replace(/\/+$/, '');
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
};

const isConfigured = () => Boolean(baseUrl());

const request = async (method, path, { json, form, timeoutMs = 120000 } = {}) => {
  const root = baseUrl();
  if (!root) throw new RagError('The research search service is not configured.', { status: 503 });

  const headers = {};
  if (process.env.RAG_API_KEY) headers['X-API-Key'] = process.env.RAG_API_KEY;
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }

  let res;
  try {
    res = await fetch(`${root}${path}`, { method, headers, body, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? 'timed out' : err.cause?.code || err.message;
    throw new RagError(`Research search service unreachable (${reason}).`, { retryable: true });
  }

  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = { detail: text.slice(0, 300) }; }

  if (!res.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : `HTTP ${res.status}`;
    throw new RagError(detail, { status: res.status, retryable: res.status >= 500 || res.status === 429 });
  }
  return data;
};

/** Indexes (or re-indexes) one paper's PDF under the ResearchReel document ID. */
const indexPaper = async ({ id, buffer, title, authors, year, doi }) => {
  const form = new FormData();
  form.append('paper_id', id);
  form.append('file', new Blob([buffer], { type: 'application/pdf' }), `${id}.pdf`);
  if (title) form.append('title', title);
  if (authors?.length) form.append('authors', authors.join(', '));
  if (year) form.append('year', String(year));
  if (doi) form.append('doi', doi);
  return request('POST', '/api/v1/papers', { form, timeoutMs: 15 * 60 * 1000 });
};

const updateMetadata = (id, { title, authors, year }) =>
  request('PATCH', `/api/v1/papers/${encodeURIComponent(id)}`, { json: { title, authors, year }, timeoutMs: 60000 });

const removePaper = (id) => request('DELETE', `/api/v1/papers/${encodeURIComponent(id)}`, { timeoutMs: 60000 });

const query = ({ question, paperIds }) =>
  request('POST', '/api/v1/query', { json: { query: question, paper_ids: paperIds }, timeoutMs: 3 * 60 * 1000 });

const TOOLS = {
  compare: { minPapers: 2 },
  review: { minPapers: 1 },
  gaps: { minPapers: 1 },
  contradictions: { minPapers: 2 },
  timeline: { minPapers: 1 }
};

const runTool = (tool, paperIds) =>
  request('POST', `/api/v1/intel/${tool}`, { json: { paper_ids: paperIds }, timeoutMs: 5 * 60 * 1000 });

const health = () => request('GET', '/health', { timeoutMs: 5000 });

module.exports = { RagError, isConfigured, indexPaper, updateMetadata, removePaper, query, runTool, health, TOOLS };
