const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5015;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'analytics-service',
    database: 'ClickHouse + Kafka',
    timestamp: new Date()
  });
});

// Root API path matching gateway
app.get('/api/analytics', (req, res) => {
  res.json({
    message: 'Welcome to the ResearchReel analytics-service API Gateway entrypoint!',
    endpoints: ['/health']
  });
});

app.listen(PORT, () => {
  console.log(`[Service: analytics-service] Running on port ${PORT}`);
  console.log(`[Database Connection] Simulated connection to ClickHouse + Kafka successful.`);
});
