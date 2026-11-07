/**
 * Threaded post comments: replies hang off a top-level comment (two levels);
 * `reply_to_user_id` records who a reply answered. Adds likes and edit tracking.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS reply_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON post_comments (parent_id, created_at) WHERE parent_id IS NOT NULL;

    -- Replies to replies are re-pointed at their top-level comment.
    DO $$
    BEGIN
      LOOP
        UPDATE post_comments c SET parent_id = p.parent_id
          FROM post_comments p
         WHERE c.parent_id = p.id AND p.parent_id IS NOT NULL;
        EXIT WHEN NOT FOUND;
      END LOOP;
    END $$;

    CREATE TABLE IF NOT EXISTS comment_likes (
      comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (comment_id, user_id)
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS comment_likes;
    DROP INDEX IF EXISTS idx_post_comments_parent;
    ALTER TABLE post_comments DROP COLUMN IF EXISTS edited_at, DROP COLUMN IF EXISTS reply_to_user_id;
  `);
};
