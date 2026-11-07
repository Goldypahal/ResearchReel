const express = require('express');
const router = express.Router();
const db = require('../config/db');
const redisClient = require('../config/redisClient');
const { isConfigured } = require('../services/ai/llm');
const { isEmailConfigured } = require('../utils/emailService');
const { useS3 } = require('../services/storageService');
const ragClient = require('../services/rag/ragClient');
const malwareScanner = require('../middleware/virusScan');

// The RAG service is optional, so it never makes this probe fail; its result is cached for 30 s.
let ragCache = { at: 0, value: null };
const ragCheck = async () => {
  if (!ragClient.isConfigured()) return { status: 'NOT_CONFIGURED' };
  if (Date.now() - ragCache.at < 30000 && ragCache.value) return ragCache.value;
  let value;
  try {
    const h = await ragClient.health();
    value = { status: 'UP', provider: h.provider, papers: h.papers };
  } catch (err) {
    value = { status: 'DOWN' };
  }
  ragCache = { at: Date.now(), value };
  return value;
};

/** Liveness/readiness probe. 200 when Postgres and Redis respond. */
router.get('/health', async (req, res) => {
  const checks = {};
  let ok = true;
  try {
    const t = Date.now();
    await db.query('SELECT 1');
    checks.database = { status: 'UP', latency_ms: Date.now() - t };
  } catch (err) {
    ok = false;
    checks.database = { status: 'DOWN' };
  }
  try {
    const t = Date.now();
    await redisClient.client.ping();
    checks.redis = { status: 'UP', latency_ms: Date.now() - t };
  } catch (err) {
    ok = false;
    checks.redis = { status: 'DOWN' };
  }
  checks.ai = { status: isConfigured() ? 'CONFIGURED' : 'NOT_CONFIGURED' };
  checks.email = { status: isEmailConfigured() ? 'CONFIGURED' : 'NOT_CONFIGURED' };
  checks.storage = { status: useS3() ? 'S3' : 'LOCAL_DISK' };
  checks.paper_search = await ragCheck();
  const clam = await malwareScanner.ping();
  checks.malware_scan = { status: clam === null ? 'NOT_CONFIGURED' : clam ? 'UP' : 'DOWN' };
  res.status(ok ? 200 : 503).json({ status: ok ? 'UP' : 'DEGRADED', timestamp: new Date().toISOString(), uptime_seconds: Math.round(process.uptime()), services: checks });
});

module.exports = router;
