const { Pool, types } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

// Return BIGINT/COUNT(*) as JS numbers instead of strings (safe for our value ranges).
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));
// Keep DATE columns as 'YYYY-MM-DD' strings so they never shift across timezones.
types.setTypeParser(1082, (v) => v);

const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: process.env.DATABASE_SSL_STRICT === 'true' } : undefined;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl,
  options: '-c timezone=UTC'
});

// An idle client erroring (e.g. the DB restarted) must not crash the process.
pool.on('error', (err) => {
  console.error('[db] Idle client error:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
