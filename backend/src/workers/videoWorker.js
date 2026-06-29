const { Worker } = require('bullmq');
const mediaService = require('../services/mediaService');
const { connection } = require('../queues/videoQueue');

console.log('Initializing Video Transcoding Worker...');

const worker = new Worker('video-transcoding', async (job) => {
  const { filename } = job.data;

  console.log(`[Worker] Processing job ${job.id} for video: ${filename}`);

  try {
    const result = await mediaService.processVideo(job.data);
    console.log(`[Worker] Successfully processed video job ${job.id}: ${result.video_url}`);
    return result;
  } catch (error) {
    console.error(`[Worker] Failed video job ${job.id}: ${error.message}`);
    throw error;
  }
}, { 
  connection, 
  concurrency: 1 // limit concurrent FFmpeg transcoding tasks per worker process
});

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully.`);
});

worker.on('error', (err) => {
  console.error('[BullMQ Worker Error]', err);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed: ${err.message}`);
});

module.exports = worker;
