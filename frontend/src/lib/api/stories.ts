import { fetchApi } from './client';
import type { Story } from './types';

export const storiesApi = {
  list: (): Promise<Story[]> => fetchApi('/stories'),
  create: (text: string, gradient?: string): Promise<Story> =>
    fetchApi('/stories', { method: 'POST', body: JSON.stringify({ text, gradient }) }),
  markViewed: (id: string) => fetchApi(`/stories/${id}/view`, { method: 'POST' }).catch(() => undefined),
  remove: (id: string) => fetchApi(`/stories/${id}`, { method: 'DELETE' }),
};
