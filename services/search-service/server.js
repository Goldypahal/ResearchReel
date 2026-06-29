const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5009;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'search-service',
    database: 'Elasticsearch',
    timestamp: new Date()
  });
});

// Root API path matching gateway
app.get('/api/search', (req, res) => {
  res.json({
    message: 'Welcome to the ResearchReel search-service API Gateway entrypoint!',
    endpoints: ['/health']
  });
});

app.listen(PORT, () => {
  console.log(`[Service: search-service] Running on port ${PORT}`);
  console.log(`[Database Connection] Simulated connection to Elasticsearch successful.`);
});
