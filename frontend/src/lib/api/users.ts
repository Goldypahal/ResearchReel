import { fetchApi, fetchPage, qs } from './client';
import type { AchievementSummary, BlockedAccount, CurrentUser, LeaderboardEntry, Post, Profile, ProfileAnalytics, UserCard } from './types';

export interface UpdateProfilePayload {
  full_name?: string;
  bio?: string;
  institution?: string;
  research_interests?: string[];
  avatar_url?: string | null;
}

export const usersApi = {
  getMe: (): Promise<CurrentUser> => fetchApi('/users/me'),
  updateProfile: (data: UpdateProfilePayload): Promise<CurrentUser> =>
    fetchApi('/users/update', { method: 'PUT', body: JSON.stringify(data) }),
  getAnalytics: (days = 30): Promise<ProfileAnalytics> => fetchApi(`/users/me/analytics${qs({ days })}`),
  getAchievements: (): Promise<AchievementSummary> => fetchApi('/users/me/achievements'),
  getSuggestions: (limit = 8): Promise<UserCard[]> => fetchApi(`/users/me/suggestions${qs({ limit })}`),
  search: (q: string, limit = 20): Promise<UserCard[]> => fetchApi(`/users/search${qs({ q, limit })}`),
  getLeaderboard: (period: 'week' | 'month' | 'all', field?: string): Promise<LeaderboardEntry[]> =>
    fetchApi(`/users/leaderboard${qs({ period, field })}`),

  uploadAvatar: (file: File): Promise<{ avatar_url: string }> => {
    const form = new FormData();
    form.append('avatar', file);
    return fetchApi('/users/me/avatar', { method: 'POST', body: form });
  },
  removeAvatar: () => fetchApi('/users/me/avatar', { method: 'DELETE' }),
  deleteAccount: (password: string) =>
    fetchApi('/users/me', { method: 'DELETE', body: JSON.stringify({ password, confirm: 'DELETE' }) }),

  getProfile: (username: string): Promise<Profile> => fetchApi(`/users/${encodeURIComponent(username)}`),
  getPosts: (username: string, cursor?: string | null) =>
    fetchPage<Post>(`/users/${encodeURIComponent(username)}/posts${qs({ cursor })}`),
  getFollowers: (username: string): Promise<UserCard[]> => fetchApi(`/users/${encodeURIComponent(username)}/followers`),
  getFollowing: (username: string): Promise<UserCard[]> => fetchApi(`/users/${encodeURIComponent(username)}/following`),
  follow: (username: string) => fetchApi(`/users/${encodeURIComponent(username)}/follow`, { method: 'POST' }),
  unfollow: (username: string) => fetchApi(`/users/${encodeURIComponent(username)}/follow`, { method: 'DELETE' }),

  block: (username: string) => fetchApi(`/users/${encodeURIComponent(username)}/block`, { method: 'POST' }),
  unblock: (username: string) => fetchApi(`/users/${encodeURIComponent(username)}/block`, { method: 'DELETE' }),
  mute: (username: string) => fetchApi(`/users/${encodeURIComponent(username)}/mute`, { method: 'POST' }),
  unmute: (username: string) => fetchApi(`/users/${encodeURIComponent(username)}/mute`, { method: 'DELETE' }),
  getBlocked: (): Promise<{ blocked: BlockedAccount[]; muted: BlockedAccount[] }> => fetchApi('/users/me/blocked'),
};
