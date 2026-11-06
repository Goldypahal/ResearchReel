const { Queue } = require('bullmq');
const { buildConnection } = require('./connection');

/**
 * Background job queues.
 *  - media:      transcode uploaded reel videos
 *  - reel-render: render AI reel drafts into MP4s
 */
const QUEUES = { MEDIA: 'media', REEL_RENDER: 'reel-render' };
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
