/**
 * Integration tests against real PostgreSQL and Redis (no mocks).
 *   TEST_DATABASE_URL (default postgresql://postgres:postgres@localhost:5432/researchreel_test)
 *   TEST_REDIS_URL    (default redis://localhost:6379/15)
 * Run with: npm run test:db
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/db/**/*.db.test.js'],
  setupFiles: ['<rootDir>/tests/db/env.js'],
  globalSetup: '<rootDir>/tests/db/globalSetup.js',
  testTimeout: 30000,
};
