export type Role = 'user' | 'moderator' | 'admin';

export interface PublicUser {
  id: string;
  username: string;
  full_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  verification_status: string;
  role?: Role;
  institution?: string | null;
  website?: string | null;
  research_interests?: string[] | null;
  orcid_id?: string | null;
  created_at?: string;
  followers_count?: number;
  is_following?: boolean;
}

export interface CurrentUser extends PublicUser {
  email: string;
  email_verified: boolean;
  role: Role;
  subscription_tier?: string;
}

export interface Profile extends PublicUser {
  followers_count: number;
  following_count: number;
  post_count: number;
  reel_count: number;
  paper_count: number;
  is_following: boolean;
  follows_you: boolean;
  is_self: boolean;
}

export interface Post {
  id: string;
  author_id: string;
  content_type: 'text' | 'image' | 'document' | 'video';
  caption: string;
  media_urls: string[];
  document_id: string | null;
  tags: string[];
  publication_status: string | null;
  doi: string | null;
  created_at: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  verification_status: string;
  document_title: string | null;
  document_url: string | null;
  document_abstract: string | null;
  document_pages: number | null;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
}

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  verification_status?: string;
  parent_id?: string | null;
}

export interface Reel {
  id: string;
  author_id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  linked_paper_id: string | null;
  paper_title: string | null;
  tags: string[];
  created_at: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  verification_status: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  is_liked: boolean;
  is_saved: boolean;
  is_following_author: boolean;
}

export interface Scene {
  title: string;
  visualDescription?: string;
  dialogue: string;
  duration: number;
  backgroundStyle: string;
}

export interface ReelDraft {
  id: string;
  author_id: string;
  linked_paper_id: string | null;
  paper_title?: string | null;
  title: string;
  description: string | null;
  scenes: Scene[];
  status: 'draft' | 'generating' | 'completed' | 'failed';
  video_url: string | null;
  part_number: number | null;
  total_parts: number | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationSettings {
  auto_generate: boolean;
  auto_upload: boolean;
  upload_interval_hours: number;
  next_upload_at: string | null;
  has_api_key: boolean;
}

export interface Paper {
  id: string;
  uploader_id?: string;
  title: string;
  file_name?: string;
  file_url: string | null;
  page_count?: number | null;
  abstract: string | null;
  summary_text?: string | null;
  key_points?: string[] | null;
  authors: string[] | null;
  doi: string | null;
  publication_year?: number | null;
  journal?: string | null;
  tags: string[] | null;
  visibility?: 'public' | 'private';
  source?: 'upload' | 'doi';
  external_url?: string | null;
  citation_count?: number | null;
  /** State in the multi-paper search index: null when search is disabled or the paper has no PDF. */
  rag_status?: RagStatus | null;
  created_at: string;
  uploader_username?: string;
  uploader_name?: string;
  uploader_avatar_url?: string | null;
  permission?: 'owner' | 'editor' | 'viewer';
  reels?: { id: string; title: string; thumbnail_url: string | null; video_url: string }[];
  share_count?: number;
  reel_count?: number;
}

export interface Participant {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  verification_status?: string;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  group_name: string | null;
  last_message: string | null;
  last_message_time: string | null;
  last_sender_id: string | null;
  unread_count: number;
  participants: Participant[];
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  created_at: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export interface Notification {
  id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  actor_username: string | null;
  actor_full_name: string | null;
  actor_avatar_url: string | null;
  following_actor?: boolean;
  preview_url?: string | null;
}

export interface Story {
  id: string;
  author_id: string;
  text: string | null;
  gradient: string | null;
  media_url: string | null;
  created_at: string;
  expires_at: string;
  viewed: boolean;
}

export interface StoryGroup {
  author_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_self: boolean;
  all_viewed: boolean;
  stories: Story[];
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  research_field: string | null;
  visibility: 'public' | 'private';
  user_role?: 'owner' | 'editor' | 'viewer';
  creator_username?: string;
  member_count?: number;
  task_count?: number;
  done_count?: number;
  document_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  project_name?: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  due_date: string | null;
  assigned_to: string | null;
  assignee_username: string | null;
  assignee_name: string | null;
  assignee_avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  role: 'owner' | 'editor' | 'viewer';
  joined_at: string;
}

export interface Lecture {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  topic: string | null;
  tags: string[];
  format: string;
  status: 'scheduled' | 'live' | 'ended';
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  max_attendees: number;
  meeting_url: string | null;
  has_meeting_url?: boolean;
  host_username: string;
  host_name: string;
  host_avatar_url: string | null;
  host_institution: string | null;
  attendee_count: number;
  comment_count: number;
  is_attending: boolean;
  is_host?: boolean;
  attendees?: { username: string; full_name: string; avatar_url: string | null; joined_at: string }[];
  comments?: LectureComment[];
}

export interface LectureComment {
  id: string;
  content: string;
  created_at: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export interface Conference {
  id: string;
  name: string;
  acronym: string | null;
  description: string | null;
  field: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  submission_deadline: string | null;
  website_url: string | null;
  follower_count: number;
  is_following: boolean;
  created_by: string | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  goal: number;
  progress: number;
  unlocked: boolean;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  verification_status: string;
  institution: string | null;
  research_interests: string[] | null;
  score: number;
  rank: number;
}

export interface CrossrefPaper {
  doi: string | null;
  doi_url: string | null;
  pdf_url: string | null;
  landing_url: string | null;
  title: string;
  abstract: string;
  authors: { name: string; orcid: string | null; affiliation: string | null }[];
  journal: string | null;
  year: number | null;
  cited_by_count: number;
  tags: string[];
  id?: string | null;
  already_imported?: boolean;
}

export type RagStatus = 'pending' | 'indexing' | 'ready' | 'failed' | 'unsupported';

export interface AiSource {
  documentId: string;
  title: string;
  /** Citation number used in the answer text, e.g. [1]. */
  number?: number;
  page?: number | null;
  section?: string | null;
  quote?: string | null;
}

export interface AiMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AiSource[];
  notice?: string | null;
  created_at?: string;
}

export interface AiStatus {
  configured: boolean;
  general_chat: boolean;
  paper_search: boolean;
  research_tools: ResearchTool[];
  max_papers: number;
  daily_limit: number;
}

export type ResearchTool = 'compare' | 'review' | 'gaps' | 'contradictions' | 'timeline';

export interface ResearchResult {
  tool: ResearchTool;
  title: string;
  result: string;
  papers: { id: string; title: string }[];
  skipped: { id: string; title: string }[];
}

export interface AiPaperRef { id: string; title: string; rag_status?: RagStatus | null }

export interface Paged<T> { items: T[]; nextCursor: string | null }
