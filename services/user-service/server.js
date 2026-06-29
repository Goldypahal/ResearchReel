const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'user-service',
    database: 'PostgreSQL',
    timestamp: new Date()
  });
});

// Root API path matching gateway
app.get(['/api/user', '/api/users'], (req, res) => {
  res.json({
    message: 'Welcome to the ResearchReel user-service API Gateway entrypoint!',
    endpoints: ['/health']
  });
});

app.listen(PORT, () => {
  console.log(`[Service: user-service] Running on port ${PORT}`);
  console.log(`[Database Connection] Simulated connection to PostgreSQL successful.`);
});
