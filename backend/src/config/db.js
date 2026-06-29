const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
