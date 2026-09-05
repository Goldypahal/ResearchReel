/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.sql(`
    -- Enable uuid extension if not already present
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- 1. Sessions Table
    CREATE TABLE IF NOT EXISTS user_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token_hash VARCHAR(255) NOT NULL,
      device_name VARCHAR(255),
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      revoked_at TIMESTAMP WITH TIME ZONE NULL
    );

    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked_at ON user_sessions(revoked_at);

    -- 2. Project Documents Junction Table
    CREATE TABLE IF NOT EXISTS project_documents (
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
      added_by UUID REFERENCES users(id) ON DELETE SET NULL,
      added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, document_id)
    );

    -- 3. Citations Graph Table
    CREATE TABLE IF NOT EXISTS paper_citations (
      source_paper_id UUID NOT NULL,
      target_paper_id UUID NOT NULL,
      PRIMARY KEY (source_paper_id, target_paper_id)
    );

    -- 4. AI Conversations & Messages Tables
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
      title VARCHAR(255) DEFAULT 'New Conversation',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
      content TEXT NOT NULL,
      sources JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Add deleted_at columns for soft deletion across key models
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
    ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
    ALTER TABLE reels ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

    -- 6. Essential Performance & Foreign Key Indexes
    CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
    CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_projects_creator ON projects(creator_id);
    CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_reels_author ON reels(author_id);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_reels_author;
    DROP INDEX IF EXISTS idx_notifications_user;
    DROP INDEX IF EXISTS idx_messages_sender;
    DROP INDEX IF EXISTS idx_messages_conversation;
    DROP INDEX IF EXISTS idx_tasks_project;
    DROP INDEX IF EXISTS idx_project_members_user;
    DROP INDEX IF EXISTS idx_projects_creator;
    DROP INDEX IF EXISTS idx_documents_status;
    DROP INDEX IF EXISTS idx_documents_created;
    DROP INDEX IF EXISTS idx_documents_owner;

    ALTER TABLE projects DROP COLUMN IF EXISTS deleted_at;
    ALTER TABLE reels DROP COLUMN IF EXISTS deleted_at;
    ALTER TABLE comments DROP COLUMN IF EXISTS deleted_at;
    ALTER TABLE posts DROP COLUMN IF EXISTS deleted_at;
    ALTER TABLE documents DROP COLUMN IF EXISTS deleted_at;

    DROP TABLE IF EXISTS ai_messages;
    DROP TABLE IF EXISTS ai_conversations;
    DROP TABLE IF EXISTS paper_citations;
    DROP TABLE IF EXISTS project_documents;
    DROP TABLE IF EXISTS user_sessions;
  `);
};
