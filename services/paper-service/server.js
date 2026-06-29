const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5003;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'paper-service',
    database: 'PostgreSQL + S3',
    timestamp: new Date()
  });
});

// Root API path matching gateway
app.get(['/api/paper', '/api/papers'], (req, res) => {
  res.json({
    message: 'Welcome to the ResearchReel paper-service API Gateway entrypoint!',
    endpoints: ['/health']
  });
});

app.listen(PORT, () => {
  console.log(`[Service: paper-service] Running on port ${PORT}`);
  console.log(`[Database Connection] Simulated connection to PostgreSQL + S3 successful.`);
});
