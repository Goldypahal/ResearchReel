const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5008;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'recommendation-service',
    database: 'Redis + Cassandra',
    timestamp: new Date()
  });
});

// Root API path matching gateway
app.get(['/api/recommendation', '/api/recommendations'], (req, res) => {
  res.json({
    message: 'Welcome to the ResearchReel recommendation-service API Gateway entrypoint!',
    endpoints: ['/health']
  });
});

app.listen(PORT, () => {
  console.log(`[Service: recommendation-service] Running on port ${PORT}`);
  console.log(`[Database Connection] Simulated connection to Redis + Cassandra successful.`);
});
