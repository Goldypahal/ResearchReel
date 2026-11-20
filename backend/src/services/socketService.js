const socketIO = require('socket.io');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const redisClient = require('../config/redisClient');
const db = require('../config/db');

let io = null;
const serverId = process.env.SERVER_ID || crypto.randomBytes(8).toString('hex');
const CHANNEL = 'socket:emit';

let publisher = null;
const getPublisher = () => {
  if (!publisher && process.env.NODE_ENV !== 'test') {
    publisher = redisClient.createDuplicate();
    publisher.connect().catch((err) => console.error('[socket] Redis publisher failed to connect:', err.message));
  }
  return publisher;
};

const allowedOrigins = () => (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',').map((s) => s.trim()).filter(Boolean);

/**
 * Emits an event to a room on this instance and fans it out to other instances
 * (and from background workers to the API process) through Redis pub/sub.
 */
const emitTo = (room, event, payload) => {
  if (io) io.to(room).emit(event, payload);
  const pub = getPublisher();
  if (pub && pub.isReady) {
    pub.publish(CHANNEL, JSON.stringify({ origin: serverId, room, event, payload })).catch(() => {});
  }
};

const emitToUser = (userId, event, payload) => emitTo(`user:${userId}`, event, payload);

const isParticipant = async (conversationId, userId) => {
  const r = await db.query('SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2', [conversationId, userId]);
  return r.rows.length > 0;
};

const UUID_RE = /^[0-9a-f-]{36}$/i;

const init = (server) => {
  io = socketIO(server, {
    path: '/socket.io',
    cors: { origin: allowedOrigins(), credentials: true }
  });

  if (process.env.NODE_ENV !== 'test') {
    const subscriber = redisClient.createDuplicate();
    subscriber.connect()
      .then(() => subscriber.subscribe(CHANNEL, (raw) => {
        try {
          const msg = JSON.parse(raw);
          if (msg.origin === serverId || !io) return;
          io.to(msg.room).emit(msg.event, msg.payload);
        } catch (e) { /* ignore malformed */ }
      }))
      .catch((err) => console.error('[socket] Redis subscriber failed to connect:', err.message));
  }

  // Every socket must present a short-lived socket token from GET /auth/socket-token.
  io.use(async (socket, next) => {
    try {
      // Resolve client IP respecting reverse proxy headers
      // Same rule as Express's `trust proxy` (TRUST_PROXY_HOPS): skip the trusted proxies at the
      // right of X-Forwarded-For. The leftmost entry is whatever the client sent, so it can't be trusted.
      const hops = Number(process.env.TRUST_PROXY_HOPS || 2);
      const chain = String(socket.handshake.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
      const ip = chain.length ? chain[Math.max(0, chain.length - hops)] : socket.handshake.address;

      // Rate limit socket connections per IP (default 30 connections/minute)
      if (process.env.DISABLE_RATE_LIMIT !== 'true') {
        const client = redisClient.client;
        if (client && client.isReady) {
          const key = `ratelimit:socket_conn:${ip}`;
          const multi = client.multi();
          multi.incr(key);
          multi.expire(key, 60, 'NX');
          const [count] = await multi.exec();
          if (count > (Number(process.env.SOCKET_CONNECTION_RATE_LIMIT) || 30)) {
            return next(new Error('rate_limited'));
          }
        }
      }

      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      if (decoded.type !== 'socket') return next(new Error('unauthorized'));
      socket.data.userId = decoded.id;
      socket.data.username = decoded.username;
      socket.data.clientIp = ip;
      next();
    } catch (err) {
      next(new Error(err.message === 'rate_limited' ? 'rate_limited' : 'unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    // Rate limit client incoming events per socket (max 20 events/sec)
    let eventCount = 0;
    let eventWindowStart = Date.now();
    socket.use(([event, ...args], next) => {
      const now = Date.now();
      if (now - eventWindowStart > 1000) {
        eventCount = 0;
        eventWindowStart = now;
      }
      eventCount += 1;
      if (eventCount > (Number(process.env.SOCKET_EVENT_RATE_LIMIT) || 20)) {
        return next(new Error('rate_limited'));
      }
      next();
    });

    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    socket.on('join_conversation', async (conversationId, ack) => {
      try {
        if (!UUID_RE.test(String(conversationId)) || !(await isParticipant(conversationId, userId))) {
          return typeof ack === 'function' && ack({ ok: false });
        }
        socket.join(`conversation:${conversationId}`);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (e) {
        if (typeof ack === 'function') ack({ ok: false });
      }
    });

    socket.on('leave_conversation', (conversationId) => socket.leave(`conversation:${conversationId}`));

    socket.on('typing', async ({ conversation_id: conversationId, is_typing: isTyping } = {}) => {
      if (!conversationId || !socket.rooms.has(`conversation:${conversationId}`)) return;
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        conversation_id: conversationId,
        user_id: userId,
        username: socket.data.username,
        is_typing: Boolean(isTyping)
      });
    });

    socket.on('join_lecture', (lectureId) => {
      if (UUID_RE.test(String(lectureId))) socket.join(`lecture:${lectureId}`);
    });
    socket.on('leave_lecture', (lectureId) => socket.leave(`lecture:${lectureId}`));
  });

  return io;
};

const getIO = () => io;

module.exports = { init, getIO, emitTo, emitToUser };
