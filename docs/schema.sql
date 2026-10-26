-- ResearchReel database schema (PostgreSQL).
-- GENERATED from backend/migrations with pg_dump --schema-only; do not edit by hand.
-- The migrations are the source of truth: cd backend && npm run migrate -- up -m migrations

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';
CREATE TABLE public.ai_conversations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    document_id uuid,
    title character varying(255) DEFAULT 'New Conversation'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.ai_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    content text NOT NULL,
    sources jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.analytics_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    event_type character varying(50) NOT NULL,
    entity_id uuid,
    entity_type character varying(50),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    actor_id uuid,
    action character varying(100) NOT NULL,
    target_type character varying(50),
    target_id uuid,
    ip_address character varying(45),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.billing_invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    stripe_invoice_id character varying(100),
    amount_cents integer NOT NULL,
    status character varying(20) NOT NULL,
    invoice_pdf_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.bookmarks (
    user_id uuid NOT NULL,
    post_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    post_id uuid NOT NULL,
    author_id uuid NOT NULL,
    parent_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);
CREATE TABLE public.content_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid,
    post_id uuid,
    reason character varying(255) NOT NULL,
    details text,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.conversation_participants (
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying,
    joined_at timestamp with time zone DEFAULT now(),
    last_read_at timestamp with time zone
);
CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_group boolean DEFAULT false,
    group_name character varying(100),
    group_picture_url text,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.document_versions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    document_id uuid,
    version_number integer NOT NULL,
    file_url text,
    changes_summary text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    author_id uuid,
    content text,
    change_summary text
);
CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    uploader_id uuid,
    file_name character varying(255) NOT NULL,
    file_type character varying(50),
    file_url text NOT NULL,
    summary_text text,
    key_points text[],
    embeddings_metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    title character varying(300),
    abstract text,
    doi character varying(255),
    version integer DEFAULT 1,
    is_verified boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    publication_year integer,
    journal character varying(300),
    storage_key text,
    file_size bigint DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    visibility character varying(20) DEFAULT 'private'::character varying,
    status character varying(20) DEFAULT 'ready'::character varying,
    deleted_at timestamp with time zone,
    extracted_text text,
    rag_indexed_at timestamp with time zone
);
CREATE TABLE public.follows (
    follower_id uuid NOT NULL,
    following_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.institutions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    domain character varying(255),
    logo_url text,
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.lecture_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lecture_id uuid NOT NULL,
    author_id uuid NOT NULL,
    body character varying(1000) NOT NULL,
    is_answered boolean DEFAULT false NOT NULL,
    is_hidden boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.lecture_registrations (
    lecture_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.lecture_reminders (
    lecture_id uuid NOT NULL,
    kind character varying(10) NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lecture_reminders_kind_check CHECK (((kind)::text = ANY ((ARRAY['24h'::character varying, '1h'::character varying])::text[])))
);
CREATE TABLE public.lectures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    host_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    topic character varying(80) NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    duration_minutes integer NOT NULL,
    capacity integer,
    join_url text,
    recording_url text,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lectures_capacity_check CHECK (((capacity IS NULL) OR ((capacity >= 1) AND (capacity <= 100000)))),
    CONSTRAINT lectures_duration_minutes_check CHECK (((duration_minutes >= 15) AND (duration_minutes <= 480)))
);
CREATE TABLE public.media_assets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    owner_id uuid,
    workspace_id uuid,
    file_name character varying(255) NOT NULL,
    file_size_bytes bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    s3_bucket character varying(100) NOT NULL,
    s3_key text NOT NULL,
    public_url text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    tags text[] DEFAULT '{}'::text[],
    is_favorite boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid,
    sender_id uuid,
    content text,
    message_type character varying(20) DEFAULT 'text'::character varying,
    file_url text,
    sent_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone
);
CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    actor_id uuid,
    type character varying(30) NOT NULL,
    entity_type character varying(30),
    entity_id uuid,
    message text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    emailed_at timestamp with time zone
);
CREATE TABLE public.organizations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    domain character varying(255),
    logo_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.paper_citations (
    source_paper_id uuid NOT NULL,
    target_paper_id uuid NOT NULL
);
CREATE TABLE public.pgmigrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    run_on timestamp without time zone NOT NULL
);
CREATE SEQUENCE public.pgmigrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.pgmigrations_id_seq OWNED BY public.pgmigrations.id;
CREATE TABLE public.posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid,
    content_type character varying(20) NOT NULL,
    caption text,
    media_urls text[],
    document_id uuid,
    tags text[],
    publication_status character varying(20),
    doi character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);
CREATE TABLE public.project_documents (
    project_id uuid NOT NULL,
    document_id uuid NOT NULL,
    added_by uuid,
    added_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.project_members (
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'editor'::character varying NOT NULL,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.projects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    creator_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    description text DEFAULT ''::text,
    research_field character varying(120),
    visibility character varying(20) DEFAULT 'private'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);
CREATE TABLE public.reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid,
    user_id uuid,
    reaction_type character varying(20),
    created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.reel_automation_settings (
    user_id uuid NOT NULL,
    auto_generate boolean DEFAULT false,
    auto_upload boolean DEFAULT false,
    upload_interval_hours integer DEFAULT 24,
    next_upload_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    encrypted_gemini_api_key text
);
CREATE TABLE public.reel_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid,
    linked_paper_id uuid,
    title character varying(200) NOT NULL,
    description text,
    scenes jsonb NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying,
    video_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    part_number integer,
    total_parts integer,
    error_message text,
    video_id uuid
);
CREATE TABLE public.stories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    author_id uuid NOT NULL,
    text text NOT NULL,
    gradient character varying(120),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + '24:00:00'::interval) NOT NULL
);
CREATE TABLE public.story_views (
    story_id uuid NOT NULL,
    user_id uuid NOT NULL,
    viewed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.tasks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    created_by uuid,
    assigned_to uuid,
    title character varying(300) NOT NULL,
    description text DEFAULT ''::text,
    status character varying(20) DEFAULT 'todo'::character varying NOT NULL,
    priority character varying(10) DEFAULT 'medium'::character varying,
    "position" integer DEFAULT 0,
    due_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.user_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    refresh_token_hash character varying(255) NOT NULL,
    device_name character varying(255),
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_used_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    sid uuid
);
CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(50) NOT NULL,
    password_hash text,
    full_name character varying(100),
    bio text,
    profile_picture_url text,
    verification_status character varying(20) DEFAULT 'unverified'::character varying,
    orcid_id character varying(19),
    institution_id uuid,
    research_interests text[],
    created_at timestamp with time zone DEFAULT now(),
    last_active timestamp with time zone,
    role character varying(20) DEFAULT 'user'::character varying,
    organization_id uuid,
    stripe_customer_id character varying(100),
    subscription_tier character varying(20) DEFAULT 'free'::character varying,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    institution character varying(200),
    avatar_url text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    email_preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    timezone character varying(64)
);
CREATE TABLE public.videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid,
    title character varying(200) NOT NULL,
    description text,
    video_url text NOT NULL,
    thumbnail_url text,
    duration_seconds integer,
    linked_paper_id uuid,
    timestamps jsonb,
    tags text[],
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    view_count integer DEFAULT 0,
    hls_playlist_url text,
    CONSTRAINT videos_duration_seconds_check CHECK (((duration_seconds >= 30) AND (duration_seconds <= 60)))
);
CREATE TABLE public.workspace_members (
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.workspaces (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    owner_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE ONLY public.pgmigrations ALTER COLUMN id SET DEFAULT nextval('public.pgmigrations_id_seq'::regclass);
ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.billing_invoices
    ADD CONSTRAINT billing_invoices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.billing_invoices
    ADD CONSTRAINT billing_invoices_stripe_invoice_id_key UNIQUE (stripe_invoice_id);
ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_pkey PRIMARY KEY (user_id, post_id);
ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (conversation_id, user_id);
ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (follower_id, following_id);
ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lecture_questions
    ADD CONSTRAINT lecture_questions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lecture_registrations
    ADD CONSTRAINT lecture_registrations_pkey PRIMARY KEY (lecture_id, user_id);
ALTER TABLE ONLY public.lecture_reminders
    ADD CONSTRAINT lecture_reminders_pkey PRIMARY KEY (lecture_id, kind);
ALTER TABLE ONLY public.lectures
    ADD CONSTRAINT lectures_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_domain_key UNIQUE (domain);
ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.paper_citations
    ADD CONSTRAINT paper_citations_pkey PRIMARY KEY (source_paper_id, target_paper_id);
ALTER TABLE ONLY public.pgmigrations
    ADD CONSTRAINT pgmigrations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_pkey PRIMARY KEY (project_id, document_id);
ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (project_id, user_id);
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reel_automation_settings
    ADD CONSTRAINT reel_automation_settings_pkey PRIMARY KEY (user_id);
ALTER TABLE ONLY public.reel_drafts
    ADD CONSTRAINT reel_drafts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.story_views
    ADD CONSTRAINT story_views_pkey PRIMARY KEY (story_id, user_id);
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_stripe_customer_id_key UNIQUE (stripe_customer_id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);
ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (workspace_id, user_id);
ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);
CREATE INDEX idx_analytics_events_entity ON public.analytics_events USING btree (entity_id, entity_type);
CREATE INDEX idx_analytics_events_type ON public.analytics_events USING btree (event_type);
CREATE INDEX idx_bookmarks_user ON public.bookmarks USING btree (user_id, created_at DESC);
CREATE INDEX idx_comments_post ON public.comments USING btree (post_id, created_at);
CREATE INDEX idx_documents_created ON public.documents USING btree (created_at);
CREATE INDEX idx_documents_owner ON public.documents USING btree (uploader_id);
CREATE INDEX idx_documents_status ON public.documents USING btree (status);
CREATE INDEX idx_documents_uploader_id ON public.documents USING btree (uploader_id);
CREATE INDEX idx_follows_following ON public.follows USING btree (following_id);
CREATE INDEX idx_lecture_questions_lecture ON public.lecture_questions USING btree (lecture_id, created_at);
CREATE INDEX idx_lecture_registrations_user ON public.lecture_registrations USING btree (user_id);
CREATE INDEX idx_lectures_host ON public.lectures USING btree (host_id);
CREATE INDEX idx_lectures_starts_at ON public.lectures USING btree (starts_at);
CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id);
CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);
CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);
CREATE INDEX idx_messages_sent_at ON public.messages USING btree (sent_at DESC);
CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, is_read);
CREATE INDEX idx_posts_author_created ON public.posts USING btree (author_id, created_at DESC);
CREATE INDEX idx_posts_author_id ON public.posts USING btree (author_id);
CREATE INDEX idx_posts_created_at ON public.posts USING btree (created_at DESC);
CREATE INDEX idx_posts_document_id ON public.posts USING btree (document_id);
CREATE INDEX idx_project_members_user ON public.project_members USING btree (user_id);
CREATE INDEX idx_projects_creator ON public.projects USING btree (creator_id);
CREATE INDEX idx_reactions_post_id ON public.reactions USING btree (post_id);
CREATE INDEX idx_reels_author ON public.videos USING btree (author_id);
CREATE INDEX idx_stories_author_expiry ON public.stories USING btree (author_id, expires_at);
CREATE INDEX idx_tasks_project ON public.tasks USING btree (project_id);
CREATE INDEX idx_user_sessions_revoked_at ON public.user_sessions USING btree (revoked_at);
CREATE INDEX idx_user_sessions_sid ON public.user_sessions USING btree (sid);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);
CREATE INDEX idx_videos_author_id ON public.videos USING btree (author_id);
CREATE INDEX idx_videos_created_at ON public.videos USING btree (created_at DESC);
CREATE INDEX media_assets_owner_id_index ON public.media_assets USING btree (owner_id);
CREATE INDEX media_assets_workspace_id_index ON public.media_assets USING btree (workspace_id);
CREATE UNIQUE INDEX uq_reactions_post_user ON public.reactions USING btree (post_id, user_id);
ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.billing_invoices
    ADD CONSTRAINT billing_invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id);
ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);
ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.lecture_questions
    ADD CONSTRAINT lecture_questions_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lecture_questions
    ADD CONSTRAINT lecture_questions_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lecture_registrations
    ADD CONSTRAINT lecture_registrations_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lecture_registrations
    ADD CONSTRAINT lecture_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lecture_reminders
    ADD CONSTRAINT lecture_reminders_lecture_id_fkey FOREIGN KEY (lecture_id) REFERENCES public.lectures(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lectures
    ADD CONSTRAINT lectures_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);
ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);
ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id);
ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.reel_automation_settings
    ADD CONSTRAINT reel_automation_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reel_drafts
    ADD CONSTRAINT reel_drafts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reel_drafts
    ADD CONSTRAINT reel_drafts_linked_paper_id_fkey FOREIGN KEY (linked_paper_id) REFERENCES public.documents(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.story_views
    ADD CONSTRAINT story_views_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.story_views
    ADD CONSTRAINT story_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_linked_paper_id_fkey FOREIGN KEY (linked_paper_id) REFERENCES public.documents(id);
ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;
