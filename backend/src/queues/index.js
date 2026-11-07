const { Queue } = require('bullmq');
const { buildConnection } = require('./connection');

/**
 * Background job queues.
 *  - media:      transcode uploaded reel videos
 *  - reel-render: render AI reel drafts into MP4s
 *  - rag-index:  index papers in (or remove them from) the Research RAG service
 *  - email:      notification emails and the lecture-reminder sweep
 */
const QUEUES = { MEDIA: 'media', REEL_RENDER: 'reel-render', RAG: 'rag-index', EMAIL: 'email' };
const instances = {};

const getQueue = (name) => {
  if (!instances[name]) {
    instances[name] = new Queue(name, { connection: buildConnection() });
    instances[name].on('error', (err) => console.error(`[queue:${name}]`, err.message));
  }
  return instances[name];
};

const addJob = (name, data, opts = {}) => getQueue(name).add(name, data, {
  attempts: 2,
  backoff: { type: 'exponential', delay: 10000 },
  removeOnComplete: 500,
  removeOnFail: 500,
  ...opts
});

module.exports = { QUEUES, getQueue, addJob };
