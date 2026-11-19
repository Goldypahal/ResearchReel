// Standalone background worker (optional): `npm run worker`.
require('dotenv').config({ quiet: true });

if (process.env.SENTRY_DSN) {
  try {
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    console.error('Failed to initialize Sentry on worker:', err.message);
  }
}

const worker = require('./workers/videoWorker');
const ragWorker = require('./workers/ragWorker').start();
const emailWorker = require('./workers/emailWorker').start();
require('./services/reelScheduler').start();

const stop = async () => {
  await Promise.all([worker.close(), emailWorker.close(), ragWorker ? ragWorker.close() : null]);
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
