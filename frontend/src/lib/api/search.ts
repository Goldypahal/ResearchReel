import { fetchApi } from './client';

export interface SearchResultItem {
  id: string;
  type: 'document' | 'post' | 'video' | 'user' | 'project' | 'reel';
  title: string;
  description?: string;
  score?: number;
  metadata?: Record<string, any>;
}

export const searchApi = {
  search: (query: string, type: string = 'all', cursor?: string): Promise<SearchResultItem[]> =>
    fetchApi(`/search/documents?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}${cursor ? `&cursor=${cursor}` : ''}`),
};
