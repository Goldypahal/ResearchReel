import { fetchApi } from './client';

export interface ReelDraft {
  id: string;
  author_id: string;
  source_document_id?: string;
  title: string;
  description?: string;
  script?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  status: 'draft' | 'processing' | 'ready' | 'published' | 'failed';
  visibility: 'private' | 'public';
  created_at: string;
}

export interface GenerateReelPayload {
  document_id: string;
  title?: string;
  split_mode?: string;
  parts_mode?: string;
  parts_count?: number;
}

export const reelsApi = {
  getDrafts: (): Promise<ReelDraft[]> => fetchApi('/reels/drafts'),
  getDraftById: (id: string): Promise<ReelDraft> => fetchApi(`/reels/draft/${id}`),
  generateDraft: (payload: GenerateReelPayload): Promise<ReelDraft> =>
    fetchApi('/reels/generate-draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateDraft: (id: string, data: Partial<ReelDraft>): Promise<ReelDraft> =>
    fetchApi(`/reels/draft/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  publishDraft: (id: string) =>
    fetchApi(`/reels/publish-draft/${id}`, {
      method: 'POST',
    }),
};
