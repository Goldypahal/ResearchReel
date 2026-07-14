const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isTLS = redisUrl.startsWith('rediss://');

const socketOptions = {
  connectTimeout: 15000,
  reconnectStrategy: (retries) => {
    if (retries > 20) {
      console.error('[Redis] Max reconnection attempts reached, giving up.');
      return new Error('Redis max retries reached');
    }
    console.log(`[Redis] Reconnecting attempt #${retries}...`);
    return Math.min(retries * 200, 5000); // reconnect with backoff up to 5s
  }
};

// Upstash (and most managed Redis) require TLS with SNI servername
if (isTLS) {
  socketOptions.tls = true;
  socketOptions.servername = new URL(redisUrl).hostname;
}

const client = createClient({
  url: redisUrl,
  socket: socketOptions
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
  incr: async (key) => {
    try {
      return await client.incr(key);
    } catch (err) {
      console.error('[Redis Incr Error]', err);
      return null;
    }
  },
  expire: async (key, seconds) => {
    try {
      return await client.expire(key, seconds);
    } catch (err) {
      console.error('[Redis Expire Error]', err);
      return null;
    }
  },
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

