/**
 * Blocking and muting.
 *   user_blocks: the two accounts disappear for each other (profiles, posts,
 *                comments, search, suggestions) and can't follow, message,
 *                comment on, mention or notify each other.
 *   user_mutes:  the muted account's posts and stories leave the muter's feed;
 *                they aren't told and can still interact.
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (blocker_id, blocked_id),
      CHECK (blocker_id <> blocked_id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks (blocked_id);

    CREATE TABLE IF NOT EXISTS user_mutes (
      muter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      muted_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (muter_id, muted_id),
      CHECK (muter_id <> muted_id)
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS user_mutes; DROP TABLE IF EXISTS user_blocks;');
};
