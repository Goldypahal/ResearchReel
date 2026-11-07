import { fetchApi, fetchEnvelope, qs } from './client';
import type { Notification } from './types';

export const notificationsApi = {
  list: async (cursor?: string | null) => {
    const res = await fetchEnvelope<Notification[]>(`/notifications${qs({ cursor })}`);
    return {
      items: (res.data || []) as Notification[],
      nextCursor: (res.nextCursor ?? null) as string | null,
      unreadCount: Number(res.unreadCount || 0),
    };
  },
  unreadCount: async (): Promise<number> => (await fetchApi<{ count: number }>('/notifications/unread-count')).count,
  markRead: (id: string) => fetchApi(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => fetchApi('/notifications/read-all', { method: 'POST' }),
  emailPreferences: (): Promise<EmailPreferences> => fetchApi('/notifications/email-preferences'),
  updateEmailPreferences: (patch: { categories?: Record<string, boolean>; timezone?: string | null }): Promise<EmailPreferences> =>
    fetchApi('/notifications/email-preferences', { method: 'PUT', body: JSON.stringify(patch) }),
  /** Works signed out: the token in the email link identifies the user. */
  unsubscribe: (token: string): Promise<{ category: string; label: string }> =>
    fetchApi(`/notifications/unsubscribe${qs({ token })}`, { method: 'POST' }),
};

export interface EmailPreferences {
  categories: { key: string; label: string; enabled: boolean }[];
  timezone: string | null;
}
