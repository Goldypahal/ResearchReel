const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const multer = require('multer');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

dotenv.config({ quiet: true });

const logger = require('./utils/logger');
const rateLimiter = require('./middleware/rateLimiter');
const requestIdMiddleware = require('./middleware/requestId');
const { sendError } = require('./utils/response');
const { UPLOAD_DIR, ensureUploadDir } = require('./services/storageService');

const app = express();

// Render/Fly/Heroku-style proxies: trust the first hop so req.ip and secure cookies work.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));
app.disable('x-powered-by');

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean);

app.use(requestIdMiddleware);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  credentials: true
}));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (message) => logger.http(message.trim()) },
  skip: (req) => req.path === '/api/v1/health'
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api', rateLimiter(Number(process.env.API_RATE_LIMIT || 300), 60));

// Uploaded files (when using local disk storage).
ensureUploadDir();
app.use('/uploads', (req, res, next) => {
  if (req.path.startsWith('/.staging')) return res.status(404).end();
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'");
  next();
}, express.static(UPLOAD_DIR, { maxAge: '7d', index: false, dotfiles: 'deny' }));

app.get('/', (req, res) => res.json({ name: 'ResearchReel API', status: 'running', docs: '/api/v1/health' }));

const { lectureRouter, conferenceRouter } = require('./routes/eventRoutes');
const routes = {
  auth: require('./routes/authRoutes'),
  posts: require('./routes/postRoutes'),
  reels: require('./routes/reelRoutes'),
  ai: require('./routes/aiRoutes'),
  messages: require('./routes/messageRoutes'),
  projects: require('./routes/projectRoutes'),
  users: require('./routes/userRoutes'),
  search: require('./routes/searchRoutes'),
  media: require('./routes/mediaRoutes'),
  doi: require('./routes/doiRoutes'),
  moderation: require('./routes/moderationRoutes'),
  documents: require('./routes/documentRoutes'),
  notifications: require('./routes/notificationRoutes'),
  stories: require('./routes/storyRoutes'),
  lectures: lectureRouter,
  conferences: conferenceRouter
};

for (const [name, router] of Object.entries(routes)) {
  app.use(`/api/v1/${name}`, router);
  app.use(`/api/${name}`, router); // legacy un-versioned prefix
}
const community = require('./routes/communityRoutes');
const health = require('./routes/healthRoutes');
app.use('/api/v1', community, health);
app.use('/api', community, health);

app.use((req, res) => sendError(res, 'Not found.', 404, 'NOT_FOUND', req));

// Central error handler: map known error types, never leak internals on 5xx.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large.' : err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Unexpected file field.' : err.message;
    return sendError(res, msg, 400, 'VALIDATION_ERROR', req);
  }
  if (err.type === 'entity.too.large') return sendError(res, 'Request is too large.', 413, 'PAYLOAD_TOO_LARGE', req);
  if (err.type === 'entity.parse.failed') return sendError(res, 'Malformed JSON body.', 400, 'VALIDATION_ERROR', req);

  // PostgreSQL errors
  if (err.code === '23505') return sendError(res, 'That already exists.', 409, 'CONFLICT_ERROR', req);
  if (err.code === '22P02' || err.code === '22007' || err.code === '22008') return sendError(res, 'Invalid input.', 400, 'VALIDATION_ERROR', req);
  if (err.code === '23503') return sendError(res, 'A referenced item does not exist.', 400, 'VALIDATION_ERROR', req);

  const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  if (statusCode >= 500) {
    logger.error(`[${req.id}] ${req.method} ${req.originalUrl}: ${err.stack || err.message}`);
    const expose = err.code === 'AI_UNAVAILABLE' || err.code === 'QUEUE_UNAVAILABLE' || err.code === 'EXTERNAL_SERVICE_ERROR';
    return sendError(res, expose ? err.message : 'Something went wrong on our side. Please try again.', statusCode, expose ? err.code : 'INTERNAL_SERVER_ERROR', req);
  }
  return sendError(res, err.message || 'Request failed.', statusCode, typeof err.code === 'string' ? err.code : 'REQUEST_FAILED', req);
});

module.exports = app;
