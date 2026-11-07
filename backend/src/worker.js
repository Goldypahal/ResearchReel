// Standalone background worker (optional): `npm run worker`.
require('dotenv').config({ quiet: true });
const worker = require('./workers/videoWorker');
const ragWorker = require('./workers/ragWorker').start();
require('./services/reelScheduler').start();

const stop = async () => {
  await Promise.all([worker.close(), ragWorker ? ragWorker.close() : null]);
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
