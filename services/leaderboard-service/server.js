const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5014;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'leaderboard-service',
    database: 'Redis Sorted Sets',
    timestamp: new Date()
  });
});

// Root API path matching gateway
app.get('/api/leaderboard', (req, res) => {
  res.json({
    message: 'Welcome to the ResearchReel leaderboard-service API Gateway entrypoint!',
    endpoints: ['/health']
  });
});

app.listen(PORT, () => {
  console.log(`[Service: leaderboard-service] Running on port ${PORT}`);
  console.log(`[Database Connection] Simulated connection to Redis Sorted Sets successful.`);
});
