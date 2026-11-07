/**
 * Links each rotated session to the one that replaced it, so a replayed
 * (stolen) refresh token can revoke the session it led to.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE user_sessions
      ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS replaced_by UUID REFERENCES user_sessions(id) ON DELETE SET NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql('ALTER TABLE user_sessions DROP COLUMN IF EXISTS replaced_by, DROP COLUMN IF EXISTS rotated_at;');
};
