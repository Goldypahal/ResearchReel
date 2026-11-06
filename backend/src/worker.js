// Standalone background worker (optional): `npm run worker`.
require('dotenv').config({ quiet: true });
const worker = require('./workers/videoWorker');
require('./services/reelScheduler').start();

const stop = async () => { await worker.close(); process.exit(0); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
