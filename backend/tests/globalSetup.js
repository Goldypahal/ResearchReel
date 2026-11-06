const { execSync } = require('child_process');
const { Client } = require('pg');

/**
 * Creates a fresh test database and runs all migrations against it.
 * Requires Postgres and Redis (see TEST_DATABASE_URL / TEST_REDIS_URL).
 */
module.exports = async () => {
  const url = new URL(process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/researchreel_test');
  const dbName = url.pathname.slice(1);
  const admin = new URL(url.toString());
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await client.query(`CREATE DATABASE "${dbName}"`);
  await client.end();
  execSync('npx node-pg-migrate up', {
    cwd: __dirname + '/..',
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'pipe'
  });
};
