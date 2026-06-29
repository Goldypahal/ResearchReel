-- ResearchReel Database Schema (PostgreSQL)

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT,
  full_name VARCHAR(100),
  bio TEXT,
  profile_picture_url TEXT,
  verification_status VARCHAR(20) DEFAULT 'unverified', -- 'unverified', 'student', 'scholar', 'faculty', 'admin'
  orcid_id VARCHAR(19),
  institution_id UUID,
  research_interests TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP
);

-- Institutions Table
CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id UUID REFERENCES users(id),
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_url TEXT NOT NULL,
  summary_text TEXT,
  key_points TEXT[],
  embeddings_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Posts Table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id),
  content_type VARCHAR(20) NOT NULL, -- 'text', 'image', 'document', 'video'
  caption TEXT,
  media_urls TEXT[],
  document_id UUID REFERENCES documents(id),
  tags TEXT[],
  publication_status VARCHAR(20), -- 'preprint', 'published', 'wip'
  doi VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Videos (Reels) Table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INT CHECK (duration_seconds BETWEEN 30 AND 60),
  linked_paper_id UUID REFERENCES documents(id),
  timestamps JSONB,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group BOOLEAN DEFAULT FALSE,
  group_name VARCHAR(100),
  group_picture_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversation Participants Table
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID REFERENCES conversations(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'member', -- 'member', 'admin'
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES users(id),
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'file', 'latex'
  file_url TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

-- Reactions Table
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id),
  user_id UUID REFERENCES users(id),
  reaction_type VARCHAR(20), -- 'interesting', 'novel', 'needs_discussion'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Follows Table
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID REFERENCES users(id),
  following_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- Bookmarks Table
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id UUID REFERENCES users(id),
  post_id UUID REFERENCES posts(id),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);
