const socketIO = require('socket.io');
const crypto = require('crypto');
const redisClient = require('../config/redisClient');
const { publishMessage } = require('./messagePublisher');
const db = require('../config/db');

let io;
const serverId = process.env.SERVER_ID || crypto.randomBytes(8).toString('hex');
process.env.SERVER_ID = serverId;

const init = (server) => {
  io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const publisher = redisClient.createDuplicate();
  const subscriber = redisClient.createDuplicate();

  publisher.connect().catch((err) => {
    console.error('Redis publisher failed to connect:', err);
  });

  subscriber.connect()
    .then(() => {
      return subscriber.pSubscribe('socket:message:*', (message, channel) => {
        try {
          const payload = JSON.parse(message);
          if (payload.origin === serverId) {
            return;
          }

          const conversationId = payload.conversation_id || payload.roomId;
          if (conversationId && io) {
            io.to(conversationId).emit('receive_message', payload);
          }
        } catch (error) {
          console.error('Error parsing Redis pub/sub message:', error);
        }
      });
    })
    .catch((error) => {
      console.error('Redis subscriber failed to connect:', error);
    });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room: ${roomId}`);
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room: ${roomId}`);
    });

    socket.on('send_message', async (data) => {
      const conversationId = data.conversation_id || data.roomId;
      if (!conversationId) {
        return;
      }

      if (data.sender_id) {
        try {
          const newMessage = await db.query(
            `INSERT INTO messages (conversation_id, sender_id, content, message_type, file_url)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [conversationId, data.sender_id, data.content || data.text || '', data.message_type || 'text', data.file_url || null]
          );

          data = { ...data, ...newMessage.rows[0] };
        } catch (error) {
          console.error('Socket message persistence error:', error);
        }
      }

      io.to(conversationId).emit('receive_message', data);

      await publishMessage(conversationId, {
        ...data,
        conversation_id: conversationId,
        origin: serverId
      });
    });

    socket.on('typing', (data) => {
      const conversationId = data.conversation_id || data.roomId;
      if (conversationId) {
        socket.to(conversationId).emit('user_typing', data);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
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
  getIO
};
