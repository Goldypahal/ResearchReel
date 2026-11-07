const { execSync } = require('child_process');
const path = require('path');
const { Client } = require('pg');

/** Creates the test database if needed and applies every migration. */
module.exports = async () => {
  require('./env');
  const url = new URL(process.env.DATABASE_URL);
  const dbName = url.pathname.slice(1);
  const admin = new URL(url.toString());
  admin.pathname = '/postgres';

  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!exists.rows.length) await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`);
  await client.end();

  execSync('npx node-pg-migrate up -m migrations', {
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: 'pipe',
  });
};
