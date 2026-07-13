exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
-- Feed query indexes
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_document_id ON posts(document_id);

CREATE INDEX IF NOT EXISTS idx_videos_author_id ON videos(author_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);

-- Document lookups
CREATE INDEX IF NOT EXISTS idx_documents_uploader_id ON documents(uploader_id);

-- Conversations and messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);

-- Reactions
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
DROP INDEX IF EXISTS idx_reactions_post_id;
DROP INDEX IF EXISTS idx_messages_sent_at;
DROP INDEX IF EXISTS idx_messages_conversation_id;
DROP INDEX IF EXISTS idx_documents_uploader_id;
DROP INDEX IF EXISTS idx_videos_created_at;
DROP INDEX IF EXISTS idx_videos_author_id;
DROP INDEX IF EXISTS idx_posts_document_id;
DROP INDEX IF EXISTS idx_posts_created_at;
DROP INDEX IF EXISTS idx_posts_author_id;
  `);
};
