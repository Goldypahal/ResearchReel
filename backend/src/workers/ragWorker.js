const { Worker } = require('bullmq');
const { buildConnection } = require('../queues/connection');
const { QUEUES } = require('../queues');
const ragClient = require('../services/rag/ragClient');
const ragIndexer = require('../services/rag/ragIndexer');

/**
 * Indexes papers in the Research RAG service. One job at a time: the service
 * serialises ingestion anyway, and this keeps embedding API usage smooth.
 * Returns null when RAG_SERVICE_URL is not set.
 */
const start = () => {
  if (!ragClient.isConfigured()) {
    console.log('[worker:rag] RAG_SERVICE_URL not set; multi-paper search is disabled.');
    return null;
  }
  const worker = new Worker(QUEUES.RAG, (job) => ragIndexer.processJob(job), {
    connection: buildConnection(), concurrency: 1, lockDuration: 16 * 60 * 1000
  });
  worker.on('completed', (job) => console.log(`[worker:rag] ${job.data.action} ${job.data.documentId} done`));
  worker.on('failed', (job, err) => console.error(`[worker:rag] ${job?.data?.action} ${job?.data?.documentId} failed: ${err.message}`));
  worker.on('error', (err) => console.error('[worker:rag]', err.message));

  // Catch up on papers that are not indexed yet (first deploy, or after downtime).
  setTimeout(() => {
    ragIndexer.backfill()
      .then((n) => { if (n) console.log(`[worker:rag] queued ${n} paper(s) for indexing`); })
      .catch((err) => console.error('[worker:rag] backfill failed:', err.message));
  }, 5000).unref();

  console.log('[worker:rag] started.');
  return worker;
};

module.exports = { start };
