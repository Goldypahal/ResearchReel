/**
 * Link each DB session row to its Redis session id (sid) so a user can see
 * and revoke individual devices, and so refresh rotates a row in place.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS sid UUID;
    CREATE INDEX IF NOT EXISTS idx_user_sessions_sid ON user_sessions(sid);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_user_sessions_sid;
    ALTER TABLE user_sessions DROP COLUMN IF EXISTS sid;
  `);
};
