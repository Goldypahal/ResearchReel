const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'video-worker',
    database: 'FFmpeg + Redis',
    timestamp: new Date()
  });
});

// Root API path matching gateway
app.get('/api/video', (req, res) => {
  res.json({
    message: 'Welcome to the ResearchReel video-worker API Gateway entrypoint!',
    endpoints: ['/health']
  });
});

app.listen(PORT, () => {
  console.log(`[Service: video-worker] Running on port ${PORT}`);
  console.log(`[Database Connection] Simulated connection to FFmpeg + Redis successful.`);
});
