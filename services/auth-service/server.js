const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'auth-service',
    database: 'PostgreSQL + Redis',
    timestamp: new Date()
  });
});

// Root API path matching gateway
app.get('/api/auth', (req, res) => {
  res.json({
    message: 'Welcome to the ResearchReel auth-service API Gateway entrypoint!',
    endpoints: ['/health']
  });
});

app.listen(PORT, () => {
  console.log(`[Service: auth-service] Running on port ${PORT}`);
  console.log(`[Database Connection] Simulated connection to PostgreSQL + Redis successful.`);
});
