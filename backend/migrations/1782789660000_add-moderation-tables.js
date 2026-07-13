exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS content_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
      post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
      reason VARCHAR(255) NOT NULL,
      details TEXT,
      status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Add a column to users to identify admins/moderators if not present
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS content_reports;
    ALTER TABLE users DROP COLUMN IF EXISTS role;
  `);
};
