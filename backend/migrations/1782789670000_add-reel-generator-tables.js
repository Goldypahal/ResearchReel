exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS reel_drafts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id UUID REFERENCES users(id) ON DELETE CASCADE,
      linked_paper_id UUID REFERENCES documents(id) ON DELETE SET NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      scenes JSONB NOT NULL,
      status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'generating', 'completed', 'failed'
      video_url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reel_automation_settings (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      auto_generate BOOLEAN DEFAULT FALSE,
      auto_upload BOOLEAN DEFAULT FALSE,
      upload_interval_hours INT DEFAULT 24,
      next_upload_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS reel_automation_settings;
    DROP TABLE IF EXISTS reel_drafts;
  `);
};
