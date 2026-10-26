import { fetchApi } from './client';
import type { ReelScene } from './reels';

export interface AskCitation {
  page?: number | null;
  section?: string | null;
  text: string;
}

export interface AskGeminiResponse {
  answer: string;
  citations: AskCitation[];
  source?: 'rag' | 'gemini';
}

export interface SummarizeResponse {
  abstract: string;
  key_points: string[];
  source?: 'rag' | 'gemini';
}

export interface Recommendation {
  document_id: string;
  post_id: string;
  title: string;
  doi?: string | null;
  publication_year?: number | null;
  journal?: string | null;
  abstract?: string | null;
  tags?: string[] | null;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  institution?: string | null;
  reactions: number;
  reason: string;
}


export const aiApi = {
  askGemini: (question: string, documentId?: string): Promise<AskGeminiResponse> =>
    fetchApi('/ai/ask-gemini', {
      method: 'POST',
      body: JSON.stringify({ question, document_id: documentId || 'global' }),
    }),

  summarizeDocument: (documentId: string): Promise<SummarizeResponse> =>
    fetchApi('/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId }),
    }),

  getRecommendations: (limit = 6): Promise<Recommendation[]> => fetchApi(`/ai/recommendations?limit=${limit}`),

  generateScript: (documentId: string): Promise<{ script: { title: string; scenes: ReelScene[] }; source: 'gemini' | 'extractive' }> =>
    fetchApi('/ai/script', {
      method: 'POST',
      body: JSON.stringify({ documentId }),
    }),
};
