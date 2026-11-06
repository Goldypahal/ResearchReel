const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

// Fail fast on missing critical configuration in production.
const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  if (process.env.NODE_ENV === 'production') process.exit(1);
}
if (process.env.NODE_ENV === 'production' && (process.env.JWT_SECRET || '').length < 32) {
  console.error('JWT_SECRET must be at least 32 characters in production.');
  process.exit(1);
}

const app = require('./app');
const socketService = require('./services/socketService');
const db = require('./config/db');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
socketService.init(server);

let worker = null;
server.listen(PORT, () => {
  console.log(`ResearchReel API listening on port ${PORT}`);
  if (process.env.START_WORKER !== 'false') {
    worker = require('./workers/videoWorker');
    require('./services/reelScheduler').start();
  }
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    try {
      if (worker) await worker.close();
      await db.pool.end();
    } finally {
      process.exit(0);
    }
  });
  setTimeout(() => process.exit(1), 15000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));
