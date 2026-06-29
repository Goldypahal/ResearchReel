const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5011;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'chat-service',
    database: 'MongoDB + Socket.IO',
    timestamp: new Date()
  });
});

// Root API path matching gateway
app.get('/api/chat', (req, res) => {
  res.json({
    message: 'Welcome to the ResearchReel chat-service API Gateway entrypoint!',
    endpoints: ['/health']
  });
});

app.listen(PORT, () => {
  console.log(`[Service: chat-service] Running on port ${PORT}`);
  console.log(`[Database Connection] Simulated connection to MongoDB + Socket.IO successful.`);
});
