/**
 * Background process: BullMQ video rendering and the scheduled reel uploader.
 * Run as its own container (`node src/worker.js`) or loaded by server.js in
 * development. Start only one scheduler per deployment.
 */
require('dotenv').config();

require('./workers/videoWorker');
const reelScheduler = require('./services/reelScheduler');

reelScheduler.start();
