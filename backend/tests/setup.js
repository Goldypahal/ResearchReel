process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-that-is-long-enough-1234';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/researchreel_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
process.env.UPLOAD_DIR = require('path').join(require('os').tmpdir(), `rr-test-uploads-${process.pid}`);
process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
delete process.env.GEMINI_API_KEY;
delete process.env.SMTP_HOST;
delete process.env.EMAIL_USER;
