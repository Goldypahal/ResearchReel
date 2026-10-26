/**
 * Refresh-token reuse detection: remember the token each session rotated away
 * from, so a replay of an old token (a sign it was stolen) can end the session.
 */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS previous_refresh_token_hash TEXT;
    ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_user_sessions_previous_hash
      ON user_sessions (previous_refresh_token_hash) WHERE previous_refresh_token_hash IS NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_user_sessions_previous_hash;
    ALTER TABLE user_sessions DROP COLUMN IF EXISTS rotated_at;
    ALTER TABLE user_sessions DROP COLUMN IF EXISTS previous_refresh_token_hash;
  `);
};
