/**
 * Email notifications: per-user category preferences and timezone (for
 * readable reminder times), a marker on notifications that were emailed, and
 * a ledger so each lecture reminder goes out once.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(64);
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS lecture_reminders (
      lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      kind VARCHAR(10) NOT NULL CHECK (kind IN ('24h', '1h')),
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (lecture_id, kind)
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS lecture_reminders;
    ALTER TABLE notifications DROP COLUMN IF EXISTS emailed_at;
    ALTER TABLE users DROP COLUMN IF EXISTS timezone;
    ALTER TABLE users DROP COLUMN IF EXISTS email_preferences;
  `);
};
