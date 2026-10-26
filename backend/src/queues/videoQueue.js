const { Queue } = require('bullmq');
const url = require('url');

// Parse Redis URL dynamically
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const parsed = url.parse(redisUrl);

const connection = {
  host: parsed.hostname || '127.0.0.1',
  port: parseInt(parsed.port || '6379', 10),
  maxRetriesPerRequest: null
};

if (parsed.auth) {
  const parts = parsed.auth.split(':');
  if (parts.length > 1) {
    connection.password = parts[1];
  } else {
    connection.password = parts[0];
  }
}

const videoQueue = new Queue('video-transcoding', { connection });

videoQueue.on('error', (err) => {
  console.error('[BullMQ VideoQueue Error]', err);
});

const addVideoJob = async (data) => {
  // One attempt: processing deletes the staged upload on failure, and failures
  // (bad file, wrong duration) are deterministic, so a retry would only hide the reason.
  return await videoQueue.add('transcode', data, {
    attempts: 1,
    removeOnComplete: { age: 24 * 3600 },
    removeOnFail: { age: 7 * 24 * 3600 },
  });
};

module.exports = {
  videoQueue,
  addVideoJob,
  connection
};
