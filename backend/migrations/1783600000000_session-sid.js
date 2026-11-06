/**
 * Store the session id (sid) embedded in access tokens so that revoking all of a
 * user's sessions (password reset, account deletion) can also clear the Redis
 * session keys that the auth middleware checks.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS sid UUID;
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(refresh_token_hash);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_user_sessions_token_hash;
    ALTER TABLE user_sessions DROP COLUMN IF EXISTS sid;
  `);
};
