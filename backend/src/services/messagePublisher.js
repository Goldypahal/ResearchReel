const redisClient = require('../config/redisClient');

const publisher = redisClient.createDuplicate();

publisher.connect().catch((err) => {
  console.error('Redis publisher failed to connect:', err);
});

const publishMessage = async (conversationId, payload) => {
  try {
    await publisher.publish(`socket:message:${conversationId}`, JSON.stringify(payload));
  } catch (error) {
    console.error('Redis publish error for conversation', conversationId, error);
  }
};

module.exports = {
  publishMessage
};
