const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const client = createClient({ 
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 200, 5000)
  }
});

let lastErrorLog = 0;
client.on('error', (err) => {
  // Avoid flooding logs while Redis is unreachable.
  if (Date.now() - lastErrorLog > 30000) {
    lastErrorLog = Date.now();
    console.error('[redis] error:', err.message);
  }
});

client.on('ready', () => {
  if (process.env.NODE_ENV !== 'test') console.log('[redis] connected');
});

if (process.env.REDIS_DISABLED !== 'true') {
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

