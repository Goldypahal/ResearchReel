const { UnrecoverableError } = require('bullmq');
const db = require('../../config/db');
const storageService = require('../storageService');
const ragClient = require('./ragClient');
const { QUEUES, addJob } = require('../../queues');

/**
 * Keeps the Research RAG index in step with ResearchReel's papers.
 * Every uploaded PDF is indexed in the background; deleted papers are removed.
 */

const JOB_OPTS = { attempts: 5, backoff: { type: 'exponential', delay: 30000 }, removeOnComplete: true, removeOnFail: true };

const enqueueIndex = async (documentId) => {
  if (!ragClient.isConfigured()) return false;
  await db.query(`UPDATE documents SET rag_status = 'pending', rag_error = NULL WHERE id = $1`, [documentId]);
  await addJob(QUEUES.RAG, { action: 'index', documentId }, { ...JOB_OPTS, jobId: `index-${documentId}` });
  return true;
};

const enqueueRemove = async (documentId) => {
  if (!ragClient.isConfigured()) return false;
  await addJob(QUEUES.RAG, { action: 'remove', documentId }, { ...JOB_OPTS, jobId: `remove-${documentId}-${Date.now()}` });
  return true;
};

/** Pushes edited title/authors/year to the index (citations and research tools show them). */
const enqueueMetadata = async (documentId) => {
  if (!ragClient.isConfigured()) return false;
  const r = await db.query(`SELECT rag_status FROM documents WHERE id = $1`, [documentId]);
  if (r.rows[0]?.rag_status !== 'ready') return false;
  await addJob(QUEUES.RAG, { action: 'metadata', documentId }, { ...JOB_OPTS, attempts: 3, jobId: `meta-${documentId}-${Date.now()}` });
  return true;
};

const setStatus = (documentId, status, error = null) =>
  db.query(
    `UPDATE documents SET rag_status = $2::varchar, rag_error = $3::text,
            rag_indexed_at = CASE WHEN $2::varchar = 'ready' THEN NOW() ELSE rag_indexed_at END
      WHERE id = $1`,
    [documentId, status, error ? String(error).slice(0, 500) : null]
  );

const indexDocument = async (documentId, { isLastAttempt = true } = {}) => {
  const r = await db.query(
    `SELECT id, COALESCE(title, file_name) AS title, authors, publication_year, doi, storage_key, file_type, deleted_at
       FROM documents WHERE id = $1`,
    [documentId]
  );
  const doc = r.rows[0];
  if (!doc || doc.deleted_at) return { skipped: 'deleted' };
  if (!doc.storage_key || doc.file_type !== 'pdf') {
    await setStatus(documentId, 'unsupported', 'Only uploaded PDFs can be indexed.');
    return { skipped: 'no-pdf' };
  }

  await setStatus(documentId, 'indexing');
  try {
    const buffer = await storageService.readFile(doc.storage_key);
    const out = await ragClient.indexPaper({
      id: doc.id, buffer, title: doc.title, authors: doc.authors, year: doc.publication_year, doi: doc.doi
    });
    // The paper may have been deleted while it was being indexed.
    const still = await db.query('SELECT deleted_at FROM documents WHERE id = $1', [documentId]);
    if (!still.rows[0] || still.rows[0].deleted_at) {
      await ragClient.removePaper(documentId).catch(() => {});
      return { skipped: 'deleted' };
    }
    await setStatus(documentId, 'ready');
    return out;
  } catch (err) {
    if (err instanceof ragClient.RagError && !err.retryable) {
      // 4xx: the PDF itself can't be indexed (scanned, corrupt, too large). Retrying won't help.
      await setStatus(documentId, 'unsupported', err.message);
      throw new UnrecoverableError(err.message);
    }
    await setStatus(documentId, isLastAttempt ? 'failed' : 'pending', err.message);
    throw err;
  }
};

const processJob = async (job) => {
  const { action, documentId } = job.data;
  if (action === 'remove') return ragClient.removePaper(documentId);
  if (action === 'metadata') {
    const r = await db.query(
      `SELECT COALESCE(title, file_name) AS title, authors, publication_year, rag_status, deleted_at FROM documents WHERE id = $1`,
      [documentId]
    );
    const d = r.rows[0];
    if (!d || d.deleted_at || d.rag_status !== 'ready') return { skipped: true };
    try {
      return await ragClient.updateMetadata(documentId, { title: d.title, authors: d.authors || [], year: d.publication_year });
    } catch (err) {
      if (err instanceof ragClient.RagError && !err.retryable) throw new UnrecoverableError(err.message);
      throw err;
    }
  }
  if (action === 'index') {
    const attempts = job.opts?.attempts || 1;
    return indexDocument(documentId, { isLastAttempt: job.attemptsMade + 1 >= attempts });
  }
  throw new UnrecoverableError(`Unknown RAG job action: ${action}`);
};

/**
 * Queues every uploaded PDF that is not indexed yet (new deployments, papers
 * uploaded before RAG was enabled, or jobs lost in a crash). With `all`, re-indexes everything.
 */
const backfill = async ({ all = false, limit = 5000 } = {}) => {
  if (!ragClient.isConfigured()) return 0;
  const r = await db.query(
    `SELECT id FROM documents
      WHERE deleted_at IS NULL AND storage_key IS NOT NULL AND file_type = 'pdf'
        ${all ? '' : `AND (rag_status IS NULL OR rag_status IN ('pending', 'indexing'))`}
      ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  for (const row of r.rows) await enqueueIndex(row.id);
  return r.rows.length;
};

module.exports = { enqueueIndex, enqueueMetadata, enqueueRemove, indexDocument, processJob, backfill };
