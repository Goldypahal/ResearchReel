const express = require('express');
const router = express.Router();
const db = require('../config/db');
const redisClient = require('../config/redisClient');
const { isConfigured } = require('../services/ai/llm');
const { isEmailConfigured } = require('../utils/emailService');
const { useS3 } = require('../services/storageService');

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
  res.status(ok ? 200 : 503).json({ status: ok ? 'UP' : 'DEGRADED', timestamp: new Date().toISOString(), uptime_seconds: Math.round(process.uptime()), services: checks });
});

module.exports = router;
