/**
 * Keep the reason a reel render failed so the studio can show it.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE reel_drafts ADD COLUMN IF NOT EXISTS error_message TEXT;
    ALTER TABLE reel_drafts ADD COLUMN IF NOT EXISTS video_id UUID;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE reel_drafts DROP COLUMN IF EXISTS video_id;
    ALTER TABLE reel_drafts DROP COLUMN IF EXISTS error_message;
  `);
};
