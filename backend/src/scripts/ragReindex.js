// Queues papers for indexing in the Research RAG service.
//   npm run rag:reindex          -> papers that are not indexed yet
//   npm run rag:reindex -- --all -> every uploaded PDF (e.g. after changing the embedding model)
require('dotenv').config({ quiet: true });
const db = require('../config/db');
const ragClient = require('../services/rag/ragClient');
const ragIndexer = require('../services/rag/ragIndexer');
const { getQueue, QUEUES } = require('../queues');

(async () => {
  if (!ragClient.isConfigured()) {
    console.error('RAG_SERVICE_URL is not set.');
    process.exit(1);
  }
  const all = process.argv.includes('--all');
  if (all) await db.query(`UPDATE documents SET rag_status = NULL WHERE deleted_at IS NULL AND storage_key IS NOT NULL`);
  const n = await ragIndexer.backfill({ all });
  console.log(`Queued ${n} paper(s). The worker indexes them one at a time.`);
  await getQueue(QUEUES.RAG).close();
  await db.pool.end();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
