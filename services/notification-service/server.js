const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5013;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'notification-service',
    database: 'Redis Queue',
    timestamp: new Date()
  });
});

// Root API path matching gateway
app.get(['/api/notification', '/api/notifications'], (req, res) => {
  res.json({
    message: 'Welcome to the ResearchReel notification-service API Gateway entrypoint!',
    endpoints: ['/health']
  });
});

app.listen(PORT, () => {
  console.log(`[Service: notification-service] Running on port ${PORT}`);
  console.log(`[Database Connection] Simulated connection to Redis Queue successful.`);
});
