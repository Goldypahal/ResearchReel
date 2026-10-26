import { fetchApi, fetchEnvelope, fetchPage, qs } from './client';
import type { Reel } from './types';

export interface ReelScene {
  title: string;
  visualDescription: string;
  dialogue: string;
  duration: number;
  backgroundStyle: string;
}

export interface ReelDraft {
  id: string;
  author_id: string;
  linked_paper_id?: string | null;
  title: string;
  description?: string | null;
  scenes: ReelScene[];
  status: 'draft' | 'generating' | 'completed' | 'failed';
  error_message?: string | null;
  video_url?: string | null;
  video_id?: string | null;
  part_number?: number | null;
  total_parts?: number | null;
  created_at: string;
  updated_at?: string;
}

export interface UploadJob {
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | string;
  title: string;
  error: string | null;
  video_id: string | null;
}

export interface GenerateReelPayload {
  document_id: string;
  split_mode?: 'single' | 'multi';
  parts_mode?: 'auto' | 'custom';
  parts_count?: number;
}

export interface ReelAutomation {
  auto_generate: boolean;
  auto_upload: boolean;
  upload_interval_hours: number;
  has_api_key: boolean;
}

export const reelsApi = {
  getAutomation: (): Promise<ReelAutomation> => fetchApi('/reels/automation'),
  updateAutomation: (data: Partial<Omit<ReelAutomation, 'has_api_key'>> & { gemini_api_key?: string }): Promise<ReelAutomation> =>
    fetchApi('/reels/automation', { method: 'POST', body: JSON.stringify(data) }),
  getFeed: (cursor?: string | null, author?: string) => fetchPage<Reel>(`/reels/feed${qs({ cursor, author })}`),
  recordView: (id: string) => fetchApi(`/reels/${id}/view`, { method: 'POST' }).catch(() => undefined),
  getDrafts: (): Promise<ReelDraft[]> => fetchApi('/reels/drafts'),
  getDraftById: (id: string): Promise<ReelDraft> => fetchApi(`/reels/draft/${id}`),
  /** Returns one draft, or several for a multi-part series. */
  generateDraft: (payload: GenerateReelPayload): Promise<ReelDraft | ReelDraft[]> =>
    fetchApi('/reels/generate-draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteDraft: (id: string) => fetchApi(`/reels/draft/${id}`, { method: 'DELETE' }),
  updateDraft: (id: string, data: Partial<Pick<ReelDraft, 'title' | 'description' | 'scenes'>>): Promise<ReelDraft> =>
    fetchApi(`/reels/draft/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  /** Own 30–60 s video; processed in the background (see getUploadJob). */
  uploadVideo: (file: File, meta: { title: string; description?: string; tags?: string; linked_paper_id?: string }): Promise<{ jobId: string }> => {
    const form = new FormData();
    form.append('video', file);
    Object.entries(meta).forEach(([k, v]) => { if (v) form.append(k, v); });
    return fetchEnvelope('/media/upload', { method: 'POST', body: form }).then((r) => ({ jobId: String(r.jobId) }));
  },
  getUploadJob: (id: string): Promise<UploadJob> => fetchApi(`/media/jobs/${id}`),
  publishDraft: (id: string): Promise<{ id: string; status: string }> =>
    fetchApi(`/reels/publish-draft/${id}`, {
      method: 'POST',
    }),
};
