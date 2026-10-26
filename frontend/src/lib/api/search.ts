import { fetchApi, qs } from './client';

export type SearchType = 'all' | 'post' | 'user' | 'document' | 'video';

export interface SearchResult {
  id: string;
  type: 'post' | 'user' | 'document' | 'video';
  title: string;
  description?: string | null;
  created_at?: string;
  score?: number;
}

export const searchApi = {
  search: (q: string, type: SearchType = 'all', cursor?: string | null): Promise<SearchResult[]> =>
    fetchApi(`/search/documents${qs({ q, type, cursor, limit: 20 })}`),
};
