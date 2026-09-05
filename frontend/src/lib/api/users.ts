import { fetchApi } from './client';

export interface UserProfileUpdate {
  full_name?: string;
  bio?: string;
  research_interests?: string[];
  institution?: string;
}

export const usersApi = {
  getMe: () => fetchApi('/users/me'),
  getProfile: (username: string) => fetchApi(`/users/${encodeURIComponent(username)}`),
  updateProfile: (data: UserProfileUpdate) =>
    fetchApi('/users/update', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getAnalytics: () => fetchApi('/users/me/analytics'),
};
