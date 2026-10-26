const express = require('express');
const router = express.Router();
const db = require('../config/db');
const redisClient = require('../config/redisClient');

router.get('/health', async (req, res) => {
  const healthDetails = {};
  let overallStatus = 'UP';

  // 1. PostgreSQL Check
  try {
    const start = Date.now();
    await db.query('SELECT 1');
    healthDetails.database = {
      status: 'UP',
      latency_ms: Date.now() - start
    };
  } catch (err) {
    overallStatus = 'DOWN';
    healthDetails.database = {
      status: 'DOWN',
      error: err.message
    };
  }

  // 2. Redis Check
  try {
    const start = Date.now();
    await redisClient.client.ping();
    healthDetails.redis = {
      status: 'UP',
      latency_ms: Date.now() - start
    };
  } catch (err) {
    overallStatus = 'DOWN';
    healthDetails.redis = {
      status: 'DOWN',
      error: err.message
    };
  }

  // 3. RAG Service Check (optional: only degrades)
  // RAG_SERVICE_URL points at the service's /api/v1 prefix; its health route lives at the root.
  if (process.env.RAG_SERVICE_URL) {
    try {
      const start = Date.now();
      const response = await fetch(`${new URL(process.env.RAG_SERVICE_URL).origin}/api/ai/health`, {
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) throw new Error(`RAG service responded with HTTP ${response.status}`);
      healthDetails.rag_service = { status: 'UP', latency_ms: Date.now() - start };
    } catch (err) {
      if (overallStatus === 'UP') overallStatus = 'DEGRADED';
      healthDetails.rag_service = { status: 'DOWN', error: err.message };
    }
  } else {
    healthDetails.rag_service = { status: 'NOT_CONFIGURED' };
  }

  // 4. Elasticsearch Check
  if (process.env.ELASTICSEARCH_URL) {
    try {
      const start = Date.now();
      const response = await fetch(process.env.ELASTICSEARCH_URL, {
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        healthDetails.elasticsearch = {
          status: 'UP',
          latency_ms: Date.now() - start
        };
      } else {
        throw new Error(`Elasticsearch responded with HTTP ${response.status}`);
      }
    } catch (err) {
      if (overallStatus === 'UP') overallStatus = 'DEGRADED';
      healthDetails.elasticsearch = {
        status: 'DOWN',
        error: err.message
      };
    }
  } else {
    healthDetails.elasticsearch = {
      status: 'NOT_CONFIGURED'
    };
  }

  healthDetails.uptime_seconds = Math.round(process.uptime());

  // Only a missing database or Redis makes the API unusable; optional services just degrade it.
  const statusCode = overallStatus === 'DOWN' ? 503 : 200;
  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: healthDetails
  });
});

module.exports = router;
