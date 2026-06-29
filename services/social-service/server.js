const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5012;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'social-service',
    database: 'Neo4j Graph DB',
    timestamp: new Date()
  });
});

// Root API path matching gateway
app.get('/api/social', (req, res) => {
  res.json({
    message: 'Welcome to the ResearchReel social-service API Gateway entrypoint!',
    endpoints: ['/health']
  });
});

app.listen(PORT, () => {
  console.log(`[Service: social-service] Running on port ${PORT}`);
  console.log(`[Database Connection] Simulated connection to Neo4j Graph DB successful.`);
});
