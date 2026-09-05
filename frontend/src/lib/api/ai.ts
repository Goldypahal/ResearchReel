import { fetchApi } from './client';

export interface CitationSource {
  documentId?: string;
  page?: number;
  section?: string;
  snippet?: string;
}

export interface AskGeminiResponse {
  answer: string;
  sources?: CitationSource[];
}

export interface SummarizeResponse {
  abstract: string;
  key_points: string[];
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

  getRecommendations: (query?: string) =>
    fetchApi(`/ai/recommendations${query ? `?q=${encodeURIComponent(query)}` : ''}`),

  generateScript: (documentId: string, query?: string) =>
    fetchApi('/ai/script', {
      method: 'POST',
      body: JSON.stringify({ documentId, query }),
    }),
};
