const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5004;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'reel-service',
    database: 'PostgreSQL + S3',
    timestamp: new Date()
  });
});

// Root API path matching gateway
app.get(['/api/reel', '/api/reels'], (req, res) => {
  res.json({
    message: 'Welcome to the ResearchReel reel-service API Gateway entrypoint!',
    endpoints: ['/health']
  });
});

app.listen(PORT, () => {
  console.log(`[Service: reel-service] Running on port ${PORT}`);
  console.log(`[Database Connection] Simulated connection to PostgreSQL + S3 successful.`);
});
