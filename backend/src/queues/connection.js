/**
 * BullMQ connection options derived from REDIS_URL (supports redis:// and rediss://).
 */
const buildConnection = () => {
  const url = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
  const conn = {
    host: url.hostname || '127.0.0.1',
    port: parseInt(url.port || '6379', 10),
    maxRetriesPerRequest: null
  };
  if (url.username) conn.username = decodeURIComponent(url.username);
  if (url.password) conn.password = decodeURIComponent(url.password);
  if (url.protocol === 'rediss:') conn.tls = {};
  const db = url.pathname && url.pathname.length > 1 ? parseInt(url.pathname.slice(1), 10) : NaN;
  if (Number.isFinite(db)) conn.db = db;
  return conn;
};

module.exports = { buildConnection };
