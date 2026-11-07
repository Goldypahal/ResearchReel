const socketIO = require('socket.io');
const crypto = require('crypto');
const redisClient = require('../config/redisClient');

let io;
const serverId = process.env.SERVER_ID || crypto.randomBytes(8).toString('hex');
process.env.SERVER_ID = serverId;

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const readCookie = (header, name) => {
  if (!header) return null;
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
};

/**
 * Same rules as the REST authMiddleware: a valid access token (cookie or
 * handshake auth) whose session has not been revoked.
 */
const SESSION_CHECK_MS = Number(process.env.SOCKET_SESSION_CHECK_MS) || 60 * 1000;

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || readCookie(socket.handshake.headers.cookie, 'accessToken');
    if (!token) return next(new Error('unauthorized'));
    const { verifyAccess } = require('../middleware/authMiddleware');
    const claims = await verifyAccess(token);
    if (!claims) return next(new Error('unauthorized'));
    socket.data.userId = claims.id;
    socket.data.sid = claims.sid;
    return next();
  } catch (_) {
    return next(new Error('unauthorized'));
  }
};

const init = (server) => {
  io = socketIO(server, {
    cors: { origin: allowedOrigins, credentials: true, methods: ['GET', 'POST'] }
  });

  io.use(authenticateSocket);

  // Fan-out across API instances: messages are persisted through REST, then
  // published on Redis so every node can deliver to its connected sockets.
  const subscriber = redisClient.createDuplicate();
  subscriber.connect()
    .then(() => subscriber.pSubscribe('socket:message:*', (message) => {
      try {
        const payload = JSON.parse(message);
        if (payload.origin === serverId) return;
        const conversationId = payload.conversation_id;
        if (conversationId && io) io.to(conversationId).emit('receive_message', payload);
      } catch (error) {
        console.error('Error parsing Redis pub/sub message:', error);
      }
    }))
    .catch((error) => console.error('Redis subscriber failed to connect:', error));

  io.on('connection', (socket) => {
    const userId = socket.data.userId;

    // A socket outlives the request that opened it: drop it once its session
    // is revoked (sign out, password change, "sign out other devices").
    const sessionCheck = setInterval(async () => {
      try {
        if ((await redisClient.get(`session:${userId}:${socket.data.sid}`)) === null) socket.disconnect(true);
      } catch (_) { /* Redis blip: check again next time */ }
    }, SESSION_CHECK_MS);
    sessionCheck.unref?.();
    socket.on('disconnect', () => clearInterval(sessionCheck));
    // Personal room for user-scoped events (notifications, new conversations).
    socket.join(`user:${userId}`);

    socket.on('join_room', async (conversationId, ack) => {
      // Lazy require avoids a circular import with chatService.
      const { isParticipant } = require('./chatService');
      const ok = typeof conversationId === 'string' && await isParticipant(conversationId, userId);
      if (ok) socket.join(conversationId);
      if (typeof ack === 'function') ack({ ok });
    });

    socket.on('leave_room', (conversationId) => {
      if (typeof conversationId === 'string') socket.leave(conversationId);
    });

    // Typing indicators only reach rooms the socket was allowed to join.
    socket.on('typing', (data) => {
      const conversationId = data && data.conversation_id;
      if (conversationId && socket.rooms.has(conversationId)) {
        socket.to(conversationId).emit('user_typing', { conversation_id: conversationId, user_id: userId });
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = {
  init,
  getIO,
  authenticateSocket
};
