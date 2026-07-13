const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const logger = require('./utils/logger');

dotenv.config();

const app = express();

const cookieParser = require('cookie-parser');
const rateLimiter = require('./middleware/rateLimiter');

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(cookieParser());

// Pipe morgan logs through Winston
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: { write: (message) => logger.http(message.trim()) }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all API routes
app.use('/api', rateLimiter(150, 60));

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Swagger Documentation setup
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ResearchReel API Documentation',
      version: '1.0.0',
      description: 'API Documentation for ResearchReel services',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'API Gateway Server',
      },
    ],
  },
  apis: [path.join(__dirname, './routes/*.js')],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to ResearchReel API Gateway',
    status: 'Running'
  });
});

// API service routes
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const reelRoutes = require('./routes/reelRoutes');
const aiRoutes = require('./routes/aiRoutes');
const messageRoutes = require('./routes/messageRoutes');
const projectRoutes = require('./routes/projectRoutes');
const userRoutes = require('./routes/userRoutes');
const searchRoutes = require('./routes/searchRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const healthRoutes = require('./routes/healthRoutes');
const doiRoutes = require('./routes/doiRoutes');
const moderationRoutes = require('./routes/moderationRoutes');
const billingRoutes = require('./routes/billingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const assetRoutes = require('./routes/assetRoutes'); // Phase 8
const analyticsRoutes = require('./routes/analyticsRoutes');
const citationRoutes = require('./routes/citationRoutes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/reels', reelRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/doi', doiRoutes);
app.use('/api/v1/moderation', moderationRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/assets', assetRoutes); // Phase 8
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/citations', citationRoutes);
app.use('/api/v1', healthRoutes);

// Fallback for current frontend if not fully updated yet
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/doi', doiRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api', healthRoutes);

// Not found handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

module.exports = app;
