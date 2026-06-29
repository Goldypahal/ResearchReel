const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5010;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'workspace-service',
    database: 'MongoDB',
    timestamp: new Date()
  });
});

// Root API path matching gateway
app.get(['/api/workspace', '/api/workspaces'], (req, res) => {
  res.json({
    message: 'Welcome to the ResearchReel workspace-service API Gateway entrypoint!',
    endpoints: ['/health']
  });
});

app.listen(PORT, () => {
  console.log(`[Service: workspace-service] Running on port ${PORT}`);
  console.log(`[Database Connection] Simulated connection to MongoDB successful.`);
});
