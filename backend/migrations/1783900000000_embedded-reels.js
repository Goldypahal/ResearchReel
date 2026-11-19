/**
 * Embedded reels: videos that play from another site (YouTube) instead of our own storage.
 *
 *   videos.source_type   'upload' (default, our file) | 'youtube_embed'
 *   videos.external_id   the YouTube video id; unique per source so re-imports update in place
 *   videos.source_*      channel, link, licence and credit line shown on the reel
 *   videos.pick_rank     order of the "Research Picks" feed (lower = earlier)
 *   users.is_system      house accounts (e.g. @researchreel_picks) that own imported content:
 *                        never notified, never on the leaderboard, cannot sign in
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;

    ALTER TABLE videos
      ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) NOT NULL DEFAULT 'upload',
      ADD COLUMN IF NOT EXISTS external_id TEXT,
      ADD COLUMN IF NOT EXISTS source_url TEXT,
      ADD COLUMN IF NOT EXISTS source_channel TEXT,
      ADD COLUMN IF NOT EXISTS source_license TEXT,
      ADD COLUMN IF NOT EXISTS source_attribution TEXT,
      ADD COLUMN IF NOT EXISTS source_dataset TEXT,
      ADD COLUMN IF NOT EXISTS pick_rank INT;
    ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_source_type_check;
    ALTER TABLE videos ADD CONSTRAINT videos_source_type_check CHECK (source_type IN ('upload', 'youtube_embed'));
    ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_youtube_id_check;
    ALTER TABLE videos ADD CONSTRAINT videos_youtube_id_check
      CHECK (source_type <> 'youtube_embed' OR external_id ~ '^[A-Za-z0-9_-]{11}$');

    CREATE UNIQUE INDEX IF NOT EXISTS uq_videos_external ON videos (source_type, external_id) WHERE external_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_videos_picks ON videos (pick_rank) WHERE source_type = 'youtube_embed' AND deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_videos_community_feed ON videos (created_at DESC) WHERE source_type = 'upload' AND deleted_at IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM videos WHERE source_type = 'youtube_embed';
    DROP INDEX IF EXISTS idx_videos_community_feed;
    DROP INDEX IF EXISTS idx_videos_picks;
    DROP INDEX IF EXISTS uq_videos_external;
    ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_youtube_id_check;
    ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_source_type_check;
    ALTER TABLE videos
      DROP COLUMN IF EXISTS pick_rank,
      DROP COLUMN IF EXISTS source_dataset,
      DROP COLUMN IF EXISTS source_attribution,
      DROP COLUMN IF EXISTS source_license,
      DROP COLUMN IF EXISTS source_channel,
      DROP COLUMN IF EXISTS source_url,
      DROP COLUMN IF EXISTS external_id,
      DROP COLUMN IF EXISTS source_type;
    ALTER TABLE users DROP COLUMN IF EXISTS is_system;
  `);
};
