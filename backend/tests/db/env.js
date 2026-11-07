// Environment for real-infrastructure tests. Loaded before any app module.
process.env.NODE_ENV = 'test';
// Off by default; rateLimits.db.test.js switches them on around its own requests.
process.env.DISABLE_RATE_LIMITS = 'true';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/researchreel_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/15';
process.env.JWT_SECRET = 'integration-test-jwt-secret-0123456789abcdef';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.FRONTEND_URL = 'http://web.test';
process.env.PUBLIC_API_ORIGIN = 'http://api.test';
delete process.env.RAG_SERVICE_URL;
delete process.env.ELASTICSEARCH_URL;
delete process.env.CLAMAV_HOST;
delete process.env.SMTP_USER;
delete process.env.EMAIL_USER;
