const { Queue } = require('bullmq');
const redisClient = require('../config/redisClient');

const queueNames = [
  'document-processing',
  'embedding-generation',
  'ai-generation',
  'reel-generation',
  'email',
  'notifications',
  'analytics'
];

const queues = {};

/**
 * Lazy-initializes and returns BullMQ queues sharing Redis configuration
 */
function getQueue(queueName) {
  if (!queueNames.includes(queueName)) {
    throw new Error(`Unknown queue name: ${queueName}`);
  }

  if (!queues[queueName]) {
    const connection = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined
    };

    queues[queueName] = new Queue(queueName, { connection });
  }

  return queues[queueName];
}

/**
 * Adds a job to a specific queue
 */
async function addJob(queueName, data, opts = {}) {
  try {
    const queue = getQueue(queueName);
    const job = await queue.add(queueName, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      ...opts
    });
    return job;
  } catch (err) {
    console.error(`Failed to add job to queue ${queueName}:`, err.message);
    // Fallback: log job locally so HTTP request doesn't crash if Redis Queue is offline in dev
    return { id: `fallback_${Date.now()}` };
  }
}

module.exports = {
  getQueue,
  addJob,
  queueNames
};
