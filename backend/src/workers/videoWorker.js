const { Worker } = require('bullmq');
const { buildConnection } = require('../queues/connection');
const { QUEUES } = require('../queues');
const mediaService = require('../services/mediaService');
const reelGeneratorService = require('../services/reelGeneratorService');

/**
 * Background worker for media jobs. Started in the API process unless START_WORKER=false,
 * or standalone via `npm run worker`.
 */
const concurrency = Number(process.env.WORKER_CONCURRENCY || 1);

const mediaWorker = new Worker(QUEUES.MEDIA, (job) => mediaService.processVideo(job.data), {
  connection: buildConnection(), concurrency
});

const reelWorker = new Worker(QUEUES.REEL_RENDER, (job) => reelGeneratorService.compileVideo(job.data.draftId), {
  connection: buildConnection(), concurrency, lockDuration: 10 * 60 * 1000
});

for (const [name, w] of [['media', mediaWorker], ['reel-render', reelWorker]]) {
  w.on('completed', (job) => console.log(`[worker:${name}] job ${job.id} completed`));
  w.on('failed', (job, err) => console.error(`[worker:${name}] job ${job?.id} failed: ${err.message}`));
  w.on('error', (err) => console.error(`[worker:${name}]`, err.message));
}

console.log(`[worker] Media workers started (concurrency ${concurrency}).`);

module.exports = { mediaWorker, reelWorker, close: () => Promise.all([mediaWorker.close(), reelWorker.close()]) };
