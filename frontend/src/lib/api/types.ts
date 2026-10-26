export type VerificationStatus = 'unverified' | 'verified' | 'student' | 'scholar' | 'faculty' | 'admin' | string;
export type ReactionType = 'interesting' | 'novel' | 'needs_discussion';

export interface CurrentUser {
  id: string;
  /** IANA zone used for reminder emails; synced from the browser. */
  timezone?: string | null;
  email: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  institution?: string | null;
  research_interests?: string[] | null;
  verification_status: VerificationStatus;
  subscription_tier?: string;
  orcid_id?: string | null;
  role: string;
}

export interface UserCard {
  id: string;
  username: string;
  full_name?: string | null;
  bio?: string | null;
  institution?: string | null;
  verification_status: VerificationStatus;
  avatar_url?: string | null;
  is_following: boolean;
}

export interface Profile extends UserCard {
  research_interests?: string[] | null;
  orcid_id?: string | null;
  created_at: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  reel_count: number;
  reactions_received: number;
  is_self: boolean;
  /** The viewer blocked / muted this account. */
  is_blocked?: boolean;
  is_muted?: boolean;
}

export interface BlockedAccount {
  id: string;
  username: string;
  full_name?: string | null;
  verification_status: VerificationStatus;
  avatar_url?: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  content_type: 'text' | 'image' | 'document' | 'video';
  caption?: string | null;
  media_urls?: string[] | null;
  tags?: string[] | null;
  publication_status?: 'preprint' | 'published' | 'wip' | null;
  doi?: string | null;
  document_id?: string | null;
  created_at: string;
  username: string;
  full_name?: string | null;
  verification_status: VerificationStatus;
  institution?: string | null;
  avatar_url?: string | null;
  file_name?: string | null;
  document_title?: string | null;
  summary_text?: string | null;
  document_url?: string | null;
  reaction_count: number;
  comment_count: number;
  viewer_reaction?: ReactionType | null;
  is_bookmarked: boolean;
  saved_at?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  /** Top-level comment this reply belongs to; null for top-level comments. */
  parent_id: string | null;
  /** Null when the comment was deleted but is kept for its replies. */
  content: string | null;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
  author_id: string | null;
  username: string | null;
  full_name?: string | null;
  verification_status: VerificationStatus | null;
  avatar_url?: string | null;
  /** Who this reply answered (shown as "replying to @…"). */
  reply_to_username: string | null;
  like_count: number;
  reply_count: number;
  viewer_liked: boolean;
  is_post_author: boolean;
}

export type CommentSort = 'top' | 'new';

export interface Notification {
  id: string;
  type: 'follow' | 'reaction' | 'comment' | 'message' | string;
  entity_type?: string | null;
  entity_id?: string | null;
  message?: string | null;
  is_read: boolean;
  created_at: string;
  actor_id?: string | null;
  actor_username?: string | null;
  actor_full_name?: string | null;
  actor_avatar_url?: string | null;
  actor_verification_status?: VerificationStatus | null;
  actor_is_followed?: boolean;
}

export interface Story {
  id: string;
  text: string;
  gradient?: string | null;
  created_at: string;
  expires_at: string;
  author_id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  viewed: boolean;
}

export interface Participant {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  verification_status: VerificationStatus;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  group_name?: string | null;
  created_at: string;
  last_message?: string | null;
  last_message_time?: string | null;
  last_message_sender_id?: string | null;
  unread_count: number;
  participants: Participant[];
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  file_url?: string | null;
  sent_at: string;
  username?: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

export interface LibraryDocument {
  id: string;
  uploader_id: string;
  title: string;
  file_name: string;
  file_type?: string;
  file_url: string;
  abstract?: string | null;
  summary_text?: string | null;
  key_points?: string[] | null;
  doi?: string | null;
  publication_year?: number | null;
  journal?: string | null;
  file_size?: number | string;
  status: 'processing' | 'ready' | 'failed' | string;
  visibility: string;
  metadata?: { pages?: number; characters?: number; error?: string } | null;
  created_at: string;
  updated_at?: string;
  permission?: 'owner' | 'editor' | 'viewer';
  has_text?: boolean;
  ai_indexed?: boolean;
}

export interface Reel {
  id: string;
  title: string;
  description?: string | null;
  video_url: string;
  hls_playlist_url?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  tags?: string[] | null;
  view_count: number;
  created_at: string;
  linked_paper_id?: string | null;
  paper_title?: string | null;
  paper_doi?: string | null;
  author_id: string;
  username: string;
  full_name?: string | null;
  verification_status: VerificationStatus;
  avatar_url?: string | null;
  is_following?: boolean;
}

export interface LeaderboardEntry extends UserCard {
  rank: number;
  research_interests?: string[] | null;
  reactions: number;
  comments: number;
  posts: number;
  new_followers: number;
  score: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  metric: string;
  target: number;
  progress: number;
  unlocked: boolean;
}

export interface AchievementSummary {
  stats: Record<string, number>;
  achievements: Achievement[];
  unlocked_count: number;
  total: number;
}

export interface MetricValue { value: number; previous: number }

export interface ProfileAnalytics {
  period_days: number;
  metrics: {
    post_views: MetricValue;
    reel_views: MetricValue;
    reactions: MetricValue;
    comments: MetricValue;
    new_followers: MetricValue;
  };
  total_views: number;
  engagement_rate: number | null;
  views_series: { date: string; count: number }[];
  follower_series: { date: string; count: number }[];
  top_posts: { id: string; title: string; type: string; created_at: string; views: number; reactions: number; comments: number }[];
}
