/**
 * Core domain tables that the API already queries but no earlier migration created
 * (projects, tasks, workspaces, comments, analytics), plus the social tables the
 * product needs (notifications, stories) and column fixes where code and schema
 * had drifted apart.
 *
 * Every statement is idempotent so this runs cleanly on a fresh database and on
 * one initialised from docs/schema.sql.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- ---------------------------------------------------------------
    -- Users: columns the repositories select/update
    -- ---------------------------------------------------------------
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS institution VARCHAR(200),
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

    -- ---------------------------------------------------------------
    -- Documents: ownership/visibility used by authorization
    -- ---------------------------------------------------------------
    ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS title VARCHAR(300),
      ADD COLUMN IF NOT EXISTS abstract TEXT,
      ADD COLUMN IF NOT EXISTS doi VARCHAR(255),
      ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS publication_year INT,
      ADD COLUMN IF NOT EXISTS journal VARCHAR(300),
      ADD COLUMN IF NOT EXISTS storage_key TEXT,
      ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private',
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ready';

    -- Version history: the controller writes author/content/change_summary
    ALTER TABLE document_versions
      ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS content TEXT,
      ADD COLUMN IF NOT EXISTS change_summary TEXT;
    ALTER TABLE document_versions ALTER COLUMN file_url DROP NOT NULL;

    -- Reels are stored in "videos"; add soft-delete + view counters
    ALTER TABLE videos
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS hls_playlist_url TEXT;

    -- One reaction per user per post (feedService upserts on this)
    DELETE FROM reactions a USING reactions b
      WHERE a.post_id = b.post_id AND a.user_id = b.user_id AND a.created_at < b.created_at;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_reactions_post_user ON reactions(post_id, user_id);

    -- Chat read receipts
    ALTER TABLE conversation_participants
      ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE;

    -- ---------------------------------------------------------------
    -- Projects & tasks (collaboration / Kanban)
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      description TEXT DEFAULT '',
      research_field VARCHAR(120),
      visibility VARCHAR(20) DEFAULT 'private',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL DEFAULT 'editor', -- owner | editor | viewer
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      title VARCHAR(300) NOT NULL,
      description TEXT DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'todo', -- todo | in_progress | review | done
      priority VARCHAR(10) DEFAULT 'medium',
      position INT DEFAULT 0,
      due_date DATE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- ---------------------------------------------------------------
    -- Workspaces
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS workspaces (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL DEFAULT 'member',
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (workspace_id, user_id)
    );

    -- ---------------------------------------------------------------
    -- Comments on posts
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS comments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE
    );
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);

    -- ---------------------------------------------------------------
    -- Notifications (follow, reaction, comment, message)
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_id UUID REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(30) NOT NULL,
      entity_type VARCHAR(30),
      entity_id UUID,
      message TEXT,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- ---------------------------------------------------------------
    -- Stories (24h text updates)
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS stories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      gradient VARCHAR(120),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
    );
    CREATE INDEX IF NOT EXISTS idx_stories_author_expiry ON stories(author_id, expires_at);

    CREATE TABLE IF NOT EXISTS story_views (
      story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (story_id, user_id)
    );

    -- ---------------------------------------------------------------
    -- Analytics events (previously created lazily at runtime)
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS analytics_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      event_type VARCHAR(50) NOT NULL,
      entity_id UUID,
      entity_type VARCHAR(50),
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_entity ON analytics_events(entity_id, entity_type);

    -- Lookups used by profile / feed queries
    CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author_id, created_at DESC);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS story_views;
    DROP TABLE IF EXISTS stories;
    DROP TABLE IF EXISTS notifications;
    DROP TABLE IF EXISTS comments;
    DROP TABLE IF EXISTS workspace_members;
    DROP TABLE IF EXISTS workspaces;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS project_members;
    DROP TABLE IF EXISTS projects;
    DROP INDEX IF EXISTS uq_reactions_post_user;
  `);
};
