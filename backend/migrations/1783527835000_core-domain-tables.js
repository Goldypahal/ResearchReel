/**
 * Core domain tables required by the V1 application code.
 *
 * Earlier migrations created only part of the schema; controllers referenced
 * tables (projects, tasks, workspaces, notifications, comments...) that no
 * migration created, so a fresh database could not run the app. This migration
 * creates every table/column the application depends on. Everything here is
 * idempotent (IF NOT EXISTS) so it is safe on partially-migrated databases.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- ---------------------------------------------------------------
    -- Users
    -- ---------------------------------------------------------------
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS institution TEXT,
      ADD COLUMN IF NOT EXISTS website TEXT,
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));

    -- ---------------------------------------------------------------
    -- Documents (research papers / uploaded files)
    -- ---------------------------------------------------------------
    ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS abstract TEXT,
      ADD COLUMN IF NOT EXISTS authors TEXT[],
      ADD COLUMN IF NOT EXISTS doi VARCHAR(255),
      ADD COLUMN IF NOT EXISTS publication_year INT,
      ADD COLUMN IF NOT EXISTS journal TEXT,
      ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public',
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ready',
      ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS storage_key TEXT,
      ADD COLUMN IF NOT EXISTS extracted_text TEXT,
      ADD COLUMN IF NOT EXISTS page_count INT,
      ADD COLUMN IF NOT EXISTS tags TEXT[],
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);

    ALTER TABLE document_versions
      ALTER COLUMN file_url DROP NOT NULL,
      ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS content TEXT,
      ADD COLUMN IF NOT EXISTS change_summary TEXT;

    -- ---------------------------------------------------------------
    -- Posts, reactions, comments, bookmarks
    -- ---------------------------------------------------------------
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

    -- One reaction (like) per user per post
    DELETE FROM reactions a USING reactions b
      WHERE a.post_id = b.post_id AND a.user_id = b.user_id AND a.created_at < b.created_at;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_reactions_post_user ON reactions(post_id, user_id);

    CREATE TABLE IF NOT EXISTS post_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at);

    -- ---------------------------------------------------------------
    -- Reels (videos table) + interactions
    -- ---------------------------------------------------------------
    ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_duration_seconds_check;
    ALTER TABLE videos
      ADD COLUMN IF NOT EXISTS hls_playlist_url TEXT,
      ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public',
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published',
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS video_likes (
      video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (video_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS video_saves (
      video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (video_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS video_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_video_comments_video ON video_comments(video_id, created_at);

    -- ---------------------------------------------------------------
    -- Messaging
    -- ---------------------------------------------------------------
    ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

    -- ---------------------------------------------------------------
    -- Notifications
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_id UUID REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(40) NOT NULL,
      entity_type VARCHAR(40),
      entity_id UUID,
      message TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

    -- ---------------------------------------------------------------
    -- Stories (24h ephemeral text/image updates)
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS stories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT,
      gradient VARCHAR(120),
      media_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
    );
    CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

    CREATE TABLE IF NOT EXISTS story_views (
      story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      viewed_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (story_id, user_id)
    );

    -- ---------------------------------------------------------------
    -- Projects & tasks
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      research_field VARCHAR(120),
      visibility VARCHAR(20) DEFAULT 'private',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) DEFAULT 'member',
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'todo',
      priority VARCHAR(20) DEFAULT 'medium',
      position INT DEFAULT 0,
      due_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ---------------------------------------------------------------
    -- Workspaces
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS workspaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) DEFAULT 'member',
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (workspace_id, user_id)
    );

    -- ---------------------------------------------------------------
    -- Analytics events
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS analytics_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      event_type VARCHAR(60) NOT NULL,
      entity_id UUID,
      entity_type VARCHAR(40),
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_entity ON analytics_events(entity_id, event_type);

    -- ---------------------------------------------------------------
    -- Moderation: allow reporting reels as well as posts
    -- ---------------------------------------------------------------
    ALTER TABLE content_reports ADD COLUMN IF NOT EXISTS video_id UUID REFERENCES videos(id) ON DELETE CASCADE;

    -- ---------------------------------------------------------------
    -- Lectures (scheduled/live academic talks)
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS lectures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      topic VARCHAR(120),
      tags TEXT[] DEFAULT '{}',
      format VARCHAR(60) DEFAULT 'Lecture',
      status VARCHAR(20) DEFAULT 'scheduled',
      scheduled_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      max_attendees INT DEFAULT 200,
      meeting_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_lectures_status ON lectures(status, scheduled_at);

    CREATE TABLE IF NOT EXISTS lecture_attendees (
      lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (lecture_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS lecture_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ---------------------------------------------------------------
    -- Conferences tracker
    -- ---------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS conferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      acronym VARCHAR(40),
      description TEXT,
      field VARCHAR(120),
      location VARCHAR(255),
      start_date DATE,
      end_date DATE,
      submission_deadline DATE,
      website_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS conference_follows (
      conference_id UUID NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (conference_id, user_id)
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS conference_follows;
    DROP TABLE IF EXISTS conferences;
    DROP TABLE IF EXISTS lecture_comments;
    DROP TABLE IF EXISTS lecture_attendees;
    DROP TABLE IF EXISTS lectures;
    DROP TABLE IF EXISTS analytics_events;
    DROP TABLE IF EXISTS workspace_members;
    DROP TABLE IF EXISTS workspaces;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS project_members;
    DROP TABLE IF EXISTS projects;
    DROP TABLE IF EXISTS story_views;
    DROP TABLE IF EXISTS stories;
    DROP TABLE IF EXISTS notifications;
    DROP TABLE IF EXISTS video_comments;
    DROP TABLE IF EXISTS video_saves;
    DROP TABLE IF EXISTS video_likes;
    DROP TABLE IF EXISTS post_comments;
    DROP INDEX IF EXISTS uq_reactions_post_user;
  `);
};
