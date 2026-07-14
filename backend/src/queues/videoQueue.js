const { Queue } = require('bullmq');

// Parse Redis URL dynamically (supports redis:// and rediss:// with TLS)
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const parsed = new URL(redisUrl);

const connection = {
  host: parsed.hostname || '127.0.0.1',
  port: parseInt(parsed.port || '6379', 10),
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  retryStrategy: (times) => (times > 20 ? null : Math.min(times * 500, 5000))
};

if (parsed.username) {
  connection.username = decodeURIComponent(parsed.username);
}
if (parsed.password) {
  connection.password = decodeURIComponent(parsed.password);
}

// Managed Redis providers (e.g. Upstash) require TLS with SNI servername
if (parsed.protocol === 'rediss:') {
  connection.tls = { servername: parsed.hostname };
}

const videoQueue = new Queue('video-transcoding', { connection });

videoQueue.on('error', (err) => {
  console.error('[BullMQ VideoQueue Error]', err);
});

const addVideoJob = async (data) => {
  return await videoQueue.add('transcode', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
};

module.exports = {
  videoQueue,
  addVideoJob,
  connection
};
