const express = require('express');
const router = express.Router();
const db = require('../config/db');
const redisClient = require('../config/redisClient');
const os = require('os');

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
    overallStatus = 'DEGRADED';
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
    overallStatus = 'DEGRADED';
    healthDetails.redis = {
      status: 'DOWN',
      error: err.message
    };
  }

  // 3. RAG Service Check
  const ragUrl = process.env.RAG_SERVICE_URL || 'http://rag-service:8000';
  try {
    const start = Date.now();
    // Using native global fetch with a 3-second timeout signal
    const response = await fetch(`${ragUrl}/api/ai/health`, {
      signal: AbortSignal.timeout(3000)
    });
    if (response.ok) {
      const body = await response.json();
      healthDetails.rag_service = {
        status: 'UP',
        latency_ms: Date.now() - start,
        details: body
      };
    } else {
      throw new Error(`RAG Service responded with HTTP ${response.status}`);
    }
  } catch (err) {
    overallStatus = 'DEGRADED';
    healthDetails.rag_service = {
      status: 'DOWN',
      error: err.message
    };
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
      overallStatus = 'DEGRADED';
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

  // 5. System/Process Metrics
  healthDetails.system = {
    uptime_seconds: process.uptime(),
    memory_usage_mb: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024)
    },
    os: {
      platform: process.platform,
      arch: process.arch,
      load_avg: os.loadavg(),
      free_memory_gb: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100,
      total_memory_gb: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100
    }
  };

  const statusCode = overallStatus === 'UP' ? 200 : 503;
  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: healthDetails
  });
});

module.exports = router;
