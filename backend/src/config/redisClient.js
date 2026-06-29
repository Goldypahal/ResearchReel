const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const client = createClient({ 
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      console.log(`[Redis] Reconnecting attempt #${retries}...`);
      return Math.min(retries * 100, 3000); // reconnect with exponential backoff up to 3s
    }
  }
});

client.on('error', (err) => {
  console.error('[Redis Client Error]', err);
});

client.on('connect', () => {
  console.log('[Redis] Client connected successfully');
});

client.on('ready', () => {
  console.log('[Redis] Client ready for commands');
});

client.on('end', () => {
  console.warn('[Redis] Connection closed');
});

if (process.env.NODE_ENV !== 'test') {
  client.connect().catch((err) => {
    console.error('[Redis] Failed to connect during startup, retrying in background...', err.message);
  });
}

const createDuplicate = () => {
  const duplicate = client.duplicate();
  duplicate.on('error', (err) => {
    console.error('[Redis Duplicate Client Error]', err);
  });
  return duplicate;
};

module.exports = {
  client,
  createDuplicate,
  get: async (key) => {
    try {
      return await client.get(key);
    } catch (err) {
      console.error('[Redis Get Error]', err);
      return null;
    }
  },
  set: async (key, value, options = {}) => {
    try {
      return await client.set(key, value, options);
    } catch (err) {
      console.error('[Redis Set Error]', err);
      return null;
    }
  },
  del: async (key) => {
    try {
      return await client.del(key);
    } catch (err) {
      console.error('[Redis Del Error]', err);
      return null;
    }
  }
};

