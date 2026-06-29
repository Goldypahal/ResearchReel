const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const app = require('./app');
const socketService = require('./services/socketService');

const PORT = process.env.PORT || 5000;
let server;

if (process.env.HTTPS_KEY_PATH && process.env.HTTPS_CERT_PATH) {
  const keyPath = path.resolve(process.env.HTTPS_KEY_PATH);
  const certPath = path.resolve(process.env.HTTPS_CERT_PATH);

  try {
    const key = fs.readFileSync(keyPath, 'utf8');
    const cert = fs.readFileSync(certPath, 'utf8');
    server = https.createServer({ key, cert }, app);
    console.log('Starting HTTPS server using configured certificate files');
  } catch (error) {
    console.error('Unable to read HTTPS certificate files:', error);
    process.exit(1);
  }
} else {
  server = http.createServer(app);
}

const io = socketService.init(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with Real-time Support`);
  if (server instanceof https.Server) {
    console.log('HTTPS enabled');
  }

  // Load background task queue worker
  if (process.env.START_WORKER !== 'false') {
    require('./workers/videoWorker');
  }
});

