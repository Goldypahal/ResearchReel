/**
 * Scheduled lectures: hosted by verified scholars/faculty, with registrations
 * and a moderated Q&A thread. Status (upcoming / live / ended) is derived from
 * starts_at + duration_minutes, so there is nothing to keep in sync.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS lectures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      topic VARCHAR(80) NOT NULL,
      tags TEXT[] NOT NULL DEFAULT '{}',
      starts_at TIMESTAMPTZ NOT NULL,
      duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480),
      capacity INTEGER CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 100000),
      join_url TEXT,
      recording_url TEXT,
      cancelled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_lectures_starts_at ON lectures (starts_at);
    CREATE INDEX IF NOT EXISTS idx_lectures_host ON lectures (host_id);

    CREATE TABLE IF NOT EXISTS lecture_registrations (
      lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (lecture_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_lecture_registrations_user ON lecture_registrations (user_id);

    CREATE TABLE IF NOT EXISTS lecture_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body VARCHAR(1000) NOT NULL,
      is_answered BOOLEAN NOT NULL DEFAULT FALSE,
      is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_lecture_questions_lecture ON lecture_questions (lecture_id, created_at);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS lecture_questions;
    DROP TABLE IF EXISTS lecture_registrations;
    DROP TABLE IF EXISTS lectures;
  `);
};
