const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: process.env.DB_POOL_MAX || 20, // max number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait for a connection to become available
});

pool.on('connect', () => {
  console.log('PostgreSQL Pool Connected');
});

pool.on('error', (err) => {
  console.error('PostgreSQL Pool Error:', err);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(-1);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
