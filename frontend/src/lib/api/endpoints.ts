import { fetchApi, uploadWithProgress } from './client';
import type * as T from './types';

const qs = (params: Record<string, string | number | boolean | null | undefined>) => {
  const s = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  return s ? `?${s}` : '';
};

export const authApi = {
  config: () => fetchApi<{ requireEmailVerification: boolean }>('/auth/config'),
  register: (body: { email: string; username: string; password: string; full_name: string }) =>
    fetchApi<{ email?: string; requiresVerification: boolean; user?: T.CurrentUser }>('/auth/register', { method: 'POST', body }),
  verifyOtp: (email: string, otp: string) => fetchApi<{ user: T.CurrentUser }>('/auth/verify-otp', { method: 'POST', body: { email, otp } }),
  resendOtp: (email: string) => fetchApi('/auth/resend-otp', { method: 'POST', body: { email } }),
  login: (email: string, password: string) => fetchApi<{ user: T.CurrentUser }>('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => fetchApi('/auth/logout', { method: 'POST' }),
  forgotPassword: (email: string) => fetchApi('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) => fetchApi('/auth/reset-password', { method: 'POST', body: { token, password } }),
  changePassword: (current_password: string, new_password: string) => fetchApi('/auth/change-password', { method: 'POST', body: { current_password, new_password } }),
  sessions: () => fetchApi<{ id: string; device_name: string; ip_address: string | null; created_at: string; last_used_at: string; current: boolean }[]>('/auth/sessions'),
  revokeSession: (id: string) => fetchApi(`/auth/sessions/${id}`, { method: 'DELETE' }),
  socketToken: () => fetchApi<{ token: string }>('/auth/socket-token'),
  linkOrcid: (orcid_id: string) => fetchApi<{ orcid_id: string; verification_status: string }>('/auth/verify/orcid', { method: 'POST', body: { orcid_id } }),
  studentVerification: (university: string) => fetchApi('/auth/verify/student', { method: 'POST', body: { university } }),
};

export const usersApi = {
  me: (skipRefresh = false) => fetchApi<T.CurrentUser>('/users/me', { skipRefresh }),
  profile: (username: string) => fetchApi<T.Profile>(`/users/${encodeURIComponent(username)}`),
  update: (body: Partial<Pick<T.CurrentUser, 'full_name' | 'bio' | 'institution' | 'website' | 'research_interests' | 'username'>>) =>
    fetchApi<T.CurrentUser>('/users/me', { method: 'PUT', body }),
  uploadAvatar: (file: File) => { const f = new FormData(); f.append('avatar', file); return fetchApi<{ avatar_url: string }>('/users/me/avatar', { method: 'POST', body: f }); },
  removeAvatar: () => fetchApi('/users/me/avatar', { method: 'DELETE' }),
  deleteAccount: () => fetchApi('/users/me', { method: 'DELETE' }),
  follow: (username: string) => fetchApi<{ is_following: boolean; followers_count: number }>(`/users/${encodeURIComponent(username)}/follow`, { method: 'POST' }),
  unfollow: (username: string) => fetchApi<{ is_following: boolean; followers_count: number }>(`/users/${encodeURIComponent(username)}/follow`, { method: 'DELETE' }),
  followers: (username: string, cursor?: string | null) => fetchApi<{ users: T.PublicUser[]; nextCursor: string | null }>(`/users/${encodeURIComponent(username)}/followers${qs({ cursor })}`),
  following: (username: string, cursor?: string | null) => fetchApi<{ users: T.PublicUser[]; nextCursor: string | null }>(`/users/${encodeURIComponent(username)}/following${qs({ cursor })}`),
  suggestions: (limit = 8) => fetchApi<(T.PublicUser & { mutual_count: number })[]>(`/users/suggestions${qs({ limit })}`),
  analytics: () => fetchApi<{
    totals: { followers: number; views_30d: number; likes_30d: number; comments_30d: number; papers: number };
    engagement_rate: string;
    follower_growth: { day: string; new_followers: number }[];
    top_content: { id: string; title: string; type: string; views: number; interactions: number }[];
  }>('/users/me/analytics'),
};

export const postsApi = {
  feed: (p: { scope?: 'all' | 'following'; author?: string; tag?: string; cursor?: string | null; limit?: number } = {}) =>
    fetchApi<{ posts: T.Post[]; nextCursor: string | null }>(`/posts/feed${qs(p)}`),
  get: (id: string) => fetchApi<T.Post>(`/posts/${id}`),
  create: (form: FormData, onProgress?: (f: number) => void) => uploadWithProgress<T.Post>('/posts', form, onProgress),
  remove: (id: string) => fetchApi(`/posts/${id}`, { method: 'DELETE' }),
  like: (id: string) => fetchApi<{ is_liked: boolean; like_count: number }>(`/posts/${id}/like`, { method: 'POST' }),
  unlike: (id: string) => fetchApi<{ is_liked: boolean; like_count: number }>(`/posts/${id}/like`, { method: 'DELETE' }),
  bookmark: (id: string) => fetchApi(`/posts/${id}/bookmark`, { method: 'POST' }),
  unbookmark: (id: string) => fetchApi(`/posts/${id}/bookmark`, { method: 'DELETE' }),
  saved: (cursor?: string | null) => fetchApi<{ posts: T.Post[]; nextCursor: string | null }>(`/posts/saved${qs({ cursor })}`),
  comments: (id: string) => fetchApi<T.Comment[]>(`/posts/${id}/comments`),
  addComment: (id: string, content: string) => fetchApi<T.Comment>(`/posts/${id}/comments`, { method: 'POST', body: { content } }),
  deleteComment: (commentId: string) => fetchApi(`/posts/comments/${commentId}`, { method: 'DELETE' }),
  view: (id: string) => fetchApi(`/posts/${id}/view`, { method: 'POST' }).catch(() => undefined),
};

export const reelsApi = {
  list: (p: { author?: string; paper?: string; scope?: 'following'; cursor?: string | null; limit?: number } = {}) =>
    fetchApi<{ reels: T.Reel[]; nextCursor: string | null }>(`/reels${qs(p)}`),
  get: (id: string) => fetchApi<T.Reel>(`/reels/${id}`),
  saved: () => fetchApi<T.Reel[]>('/reels/saved'),
  remove: (id: string) => fetchApi(`/reels/${id}`, { method: 'DELETE' }),
  like: (id: string) => fetchApi<{ is_liked: boolean; like_count: number }>(`/reels/${id}/like`, { method: 'POST' }),
  unlike: (id: string) => fetchApi<{ is_liked: boolean; like_count: number }>(`/reels/${id}/like`, { method: 'DELETE' }),
  save: (id: string) => fetchApi(`/reels/${id}/save`, { method: 'POST' }),
  unsave: (id: string) => fetchApi(`/reels/${id}/save`, { method: 'DELETE' }),
  comments: (id: string) => fetchApi<T.Comment[]>(`/reels/${id}/comments`),
  addComment: (id: string, content: string) => fetchApi<T.Comment>(`/reels/${id}/comments`, { method: 'POST', body: { content } }),
  deleteComment: (commentId: string) => fetchApi(`/reels/comments/${commentId}`, { method: 'DELETE' }),
  view: (id: string) => fetchApi(`/reels/${id}/view`, { method: 'POST' }).catch(() => undefined),
  upload: (form: FormData, onProgress?: (f: number) => void) => uploadWithProgress<{ jobId: string }>('/media/upload', form, onProgress),
  // Generator
  drafts: () => fetchApi<T.ReelDraft[]>('/reels/drafts'),
  draft: (id: string) => fetchApi<T.ReelDraft>(`/reels/draft/${id}`),
  generate: (body: { document_id: string; split_mode?: 'single' | 'multi'; parts_mode?: 'auto' | 'manual'; parts_count?: number; title?: string }) =>
    fetchApi<T.ReelDraft | T.ReelDraft[]>('/reels/generate-draft', { method: 'POST', body }),
  updateDraft: (id: string, body: Partial<Pick<T.ReelDraft, 'title' | 'description' | 'scenes'>>) => fetchApi<T.ReelDraft>(`/reels/draft/${id}`, { method: 'PUT', body }),
  deleteDraft: (id: string) => fetchApi(`/reels/draft/${id}`, { method: 'DELETE' }),
  publishDraft: (id: string) => fetchApi<{ id: string; status: string }>(`/reels/publish-draft/${id}`, { method: 'POST' }),
  myPapers: () => fetchApi<{ id: string; title: string; abstract: string | null; created_at: string }[]>('/reels/documents'),
  automation: () => fetchApi<T.AutomationSettings>('/reels/automation'),
  updateAutomation: (body: Partial<T.AutomationSettings> & { gemini_api_key?: string }) => fetchApi<T.AutomationSettings>('/reels/automation', { method: 'POST', body }),
};

export const documentsApi = {
  list: (p: { scope?: 'mine' | 'public'; q?: string; author?: string; cursor?: string | null } = {}) =>
    fetchApi<{ documents: T.Paper[]; nextCursor: string | null }>(`/documents${qs(p)}`),
  get: (id: string) => fetchApi<T.Paper>(`/documents/${id}`),
  upload: (form: FormData, onProgress?: (f: number) => void) => uploadWithProgress<T.Paper>('/documents', form, onProgress),
  update: (id: string, body: Partial<T.Paper>) => fetchApi<T.Paper>(`/documents/${id}`, { method: 'PUT', body }),
  remove: (id: string) => fetchApi(`/documents/${id}`, { method: 'DELETE' }),
};

export const doiApi = {
  lookup: (doi: string) => fetchApi<T.CrossrefPaper>(`/doi/paper${qs({ doi })}`),
  byOrcid: (orcid: string) => fetchApi<T.CrossrefPaper[]>(`/doi/author${qs({ orcid })}`),
  import: (dois: string[]) => fetchApi<{ imported: T.CrossrefPaper[]; failed: string[] }>('/doi/import', { method: 'POST', body: { dois } }),
};

export const aiApi = {
  status: () => fetchApi<{ configured: boolean; daily_limit: number }>('/ai/status'),
  ask: (question: string, opts: { documentId?: string | null; conversationId?: string | null } = {}) =>
    fetchApi<{ answer: string; sources: { documentId: string; title: string }[]; conversation_id: string }>('/ai/ask', {
      method: 'POST', body: { question, document_id: opts.documentId || undefined, conversation_id: opts.conversationId || undefined },
    }),
  summarize: (documentId: string, force = false) => fetchApi<{ abstract: string; key_points: string[] }>('/ai/summarize', { method: 'POST', body: { document_id: documentId, force } }),
  conversations: () => fetchApi<{ id: string; title: string; document_id: string | null; document_title: string | null; updated_at: string }[]>('/ai/conversations'),
  conversation: (id: string) => fetchApi<{ id: string; title: string; document_id: string | null; document_title: string | null; messages: T.AiMessage[] }>(`/ai/conversations/${id}`),
  deleteConversation: (id: string) => fetchApi(`/ai/conversations/${id}`, { method: 'DELETE' }),
  recommendations: (q?: string) => fetchApi<T.Paper[]>(`/ai/recommendations${qs({ q })}`),
};

export const messagesApi = {
  conversations: () => fetchApi<T.Conversation[]>('/messages/conversations'),
  conversation: (id: string) => fetchApi<T.Conversation>(`/messages/conversations/${id}`),
  start: (username: string) => fetchApi<T.Conversation>('/messages/conversations', { method: 'POST', body: { username } }),
  messages: (id: string, cursor?: string | null) => fetchApi<{ messages: T.Message[]; nextCursor: string | null }>(`/messages/${id}/messages${qs({ cursor })}`),
  send: (conversationId: string, content: string) => fetchApi<T.Message>('/messages/send', { method: 'POST', body: { conversation_id: conversationId, content } }),
  markRead: (conversationId: string) => fetchApi('/messages/read', { method: 'POST', body: { conversation_id: conversationId } }),
  unreadCount: () => fetchApi<{ count: number }>('/messages/unread-count'),
};

export const notificationsApi = {
  list: (cursor?: string | null) => fetchApi<{ notifications: T.Notification[]; unread_count: number; nextCursor: string | null }>(`/notifications${qs({ cursor })}`),
  unreadCount: () => fetchApi<{ count: number }>('/notifications/unread-count'),
  markRead: (ids?: string[]) => fetchApi('/notifications/read', { method: 'POST', body: ids ? { ids } : {} }),
  remove: (id: string) => fetchApi(`/notifications/${id}`, { method: 'DELETE' }),
};

export const storiesApi = {
  list: () => fetchApi<T.StoryGroup[]>('/stories'),
  create: (form: FormData) => fetchApi<T.Story>('/stories', { method: 'POST', body: form }),
  view: (id: string) => fetchApi(`/stories/${id}/view`, { method: 'POST' }).catch(() => undefined),
  viewers: (id: string) => fetchApi<{ username: string; full_name: string; avatar_url: string | null; viewed_at: string }[]>(`/stories/${id}/viewers`),
  remove: (id: string) => fetchApi(`/stories/${id}`, { method: 'DELETE' }),
};

export interface SearchResults {
  users?: T.PublicUser[];
  posts?: T.Post[];
  papers?: T.Paper[];
  reels?: T.Reel[];
}

export const searchApi = {
  search: (q: string, type: 'all' | 'users' | 'posts' | 'papers' | 'reels' = 'all', limit?: number) => fetchApi<SearchResults>(`/search${qs({ q, type, limit })}`),
  trendingTags: () => fetchApi<{ tag: string; count: number }[]>('/search/trending-tags'),
};

export type ExploreItem = (T.Post & { type: 'post' }) | (T.Reel & { type: 'reel' });

export const communityApi = {
  explore: () => fetchApi<ExploreItem[]>('/explore'),
  discover: () => fetchApi<{ papers: T.Paper[]; researchers: (T.PublicUser & { new_followers: number })[]; tags: { tag: string; count: number }[] }>('/discover'),
  leaderboard: (period: 'week' | 'month' | 'all' = 'week', field?: string) =>
    fetchApi<{ period: string; leaders: T.LeaderboardEntry[]; me: { id: string; score: number; rank: number | null } | null }>(`/leaderboard${qs({ period, field })}`),
  achievements: (username?: string) => fetchApi<{ badges: T.Badge[]; unlocked_count: number; total_score: number; metrics: Record<string, number> }>(`/achievements${qs({ username })}`),
};

export const projectsApi = {
  list: () => fetchApi<T.Project[]>('/projects'),
  get: (id: string) => fetchApi<T.Project>(`/projects/${id}`),
  create: (body: { name: string; description?: string; research_field?: string; visibility?: 'public' | 'private' }) => fetchApi<T.Project>('/projects', { method: 'POST', body }),
  update: (id: string, body: Partial<T.Project>) => fetchApi<T.Project>(`/projects/${id}`, { method: 'PUT', body }),
  remove: (id: string) => fetchApi(`/projects/${id}`, { method: 'DELETE' }),
  members: (id: string) => fetchApi<T.ProjectMember[]>(`/projects/${id}/members`),
  addMember: (id: string, username: string, role: 'editor' | 'viewer' = 'editor') => fetchApi(`/projects/${id}/members`, { method: 'POST', body: { username, role } }),
  removeMember: (id: string, userId: string) => fetchApi(`/projects/${id}/members/${userId}`, { method: 'DELETE' }),
  documents: (id: string) => fetchApi<(T.Paper & { added_at: string; added_by_username: string | null })[]>(`/projects/${id}/documents`),
  addDocument: (id: string, documentId: string) => fetchApi(`/projects/${id}/documents`, { method: 'POST', body: { document_id: documentId } }),
  removeDocument: (id: string, documentId: string) => fetchApi(`/projects/${id}/documents/${documentId}`, { method: 'DELETE' }),
  tasks: (id: string) => fetchApi<T.Task[]>(`/projects/${id}/tasks`),
  myTasks: (all = false) => fetchApi<T.Task[]>(`/projects/tasks/mine${qs({ all: all || undefined })}`),
  createTask: (id: string, body: { title: string; description?: string; status?: T.TaskStatus; priority?: T.TaskPriority; assigned_to?: string; due_date?: string }) =>
    fetchApi<T.Task>(`/projects/${id}/tasks`, { method: 'POST', body }),
  updateTask: (taskId: string, body: Partial<Pick<T.Task, 'title' | 'description' | 'status' | 'priority' | 'position' | 'due_date'>> & { assigned_to?: string | null }) =>
    fetchApi<T.Task>(`/projects/tasks/${taskId}`, { method: 'PUT', body }),
  deleteTask: (taskId: string) => fetchApi(`/projects/tasks/${taskId}`, { method: 'DELETE' }),
};

export const lecturesApi = {
  list: (status?: 'live' | 'scheduled' | 'ended') => fetchApi<T.Lecture[]>(`/lectures${qs({ status })}`),
  get: (id: string) => fetchApi<T.Lecture>(`/lectures/${id}`),
  create: (body: { title: string; description?: string; topic?: string; tags?: string; format?: string; scheduled_at?: string; start_now?: boolean; max_attendees?: number; meeting_url?: string }) =>
    fetchApi<T.Lecture>('/lectures', { method: 'POST', body }),
  setStatus: (id: string, action: 'start' | 'end') => fetchApi<{ status: string }>(`/lectures/${id}/status`, { method: 'POST', body: { action } }),
  remove: (id: string) => fetchApi(`/lectures/${id}`, { method: 'DELETE' }),
  attend: (id: string) => fetchApi(`/lectures/${id}/attend`, { method: 'POST' }),
  leave: (id: string) => fetchApi(`/lectures/${id}/attend`, { method: 'DELETE' }),
  comment: (id: string, content: string) => fetchApi<T.LectureComment>(`/lectures/${id}/comments`, { method: 'POST', body: { content } }),
};

export const conferencesApi = {
  list: (p: { scope?: 'following'; q?: string; past?: boolean } = {}) => fetchApi<T.Conference[]>(`/conferences${qs(p)}`),
  get: (id: string) => fetchApi<T.Conference>(`/conferences/${id}`),
  create: (body: Partial<T.Conference>) => fetchApi<T.Conference>('/conferences', { method: 'POST', body }),
  follow: (id: string) => fetchApi(`/conferences/${id}/follow`, { method: 'POST' }),
  unfollow: (id: string) => fetchApi(`/conferences/${id}/follow`, { method: 'DELETE' }),
  remove: (id: string) => fetchApi(`/conferences/${id}`, { method: 'DELETE' }),
};

export interface ModReport {
  id: string; reason: string; details: string | null; status: string; created_at: string;
  post_id: string | null; video_id: string | null; reporter_username: string | null;
  content_preview: string | null; content_media: string | null; author_username: string | null; author_id: string | null; content_removed: boolean;
}
export interface ModUser {
  id: string; email: string; username: string; full_name: string; verification_status: string; role: T.Role;
  orcid_id: string | null; institution: string | null; is_suspended: boolean; email_verified: boolean; created_at: string; last_active: string | null; report_count: number;
}

export const moderationApi = {
  report: (body: { post_id?: string; video_id?: string; reason: string; details?: string }) => fetchApi('/moderation/report', { method: 'POST', body }),
  stats: () => fetchApi<Record<string, number>>('/moderation/stats'),
  reports: (status: 'pending' | 'resolved' | 'dismissed' = 'pending') => fetchApi<ModReport[]>(`/moderation/reports${qs({ status })}`),
  resolve: (id: string, action: 'remove' | 'dismiss') => fetchApi(`/moderation/reports/${id}/resolve`, { method: 'POST', body: { action } }),
  users: (p: { q?: string; verification_status?: string } = {}) => fetchApi<ModUser[]>(`/moderation/users${qs(p)}`),
  updateUser: (id: string, body: { status?: string; role?: T.Role }) => fetchApi(`/moderation/users/${id}/verify`, { method: 'POST', body }),
  suspend: (id: string, suspended: boolean) => fetchApi(`/moderation/users/${id}/suspend`, { method: 'POST', body: { suspended } }),
  auditLog: () => fetchApi<{ id: string; action: string; target_type: string; target_id: string; created_at: string; actor_username: string; metadata: unknown }[]>('/moderation/audit-log'),
};

export const healthApi = {
  get: () => fetchApi<{ status: string; services: Record<string, { status: string; latency_ms?: number }> }>('/health'),
};
