const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10), // max number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 15000, // remote databases need a longer connection window
});

pool.on('connect', () => {
  console.log('PostgreSQL Pool Connected');
});

pool.on('error', (err) => {
  // Log but do not crash the server: remote pooled connections can drop
  // transiently (idle timeouts, pooler restarts) and the pool recovers.
  console.error('PostgreSQL Pool Error:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
