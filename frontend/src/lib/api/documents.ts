import { API_BASE_URL, ApiError, fetchApi, type ApiResponse } from './client';
import type { LibraryDocument } from './types';

export type DocumentItem = LibraryDocument;

export const documentsApi = {
  /** Multipart upload; the API extracts text in the background (status: processing → ready). */
  upload: (file: File, meta: { title?: string; doi?: string } = {}): Promise<LibraryDocument> => {
    const form = new FormData();
    form.append('file', file);
    if (meta.title) form.append('title', meta.title);
    if (meta.doi) form.append('doi', meta.doi);
    return fetchApi('/assets/upload', { method: 'POST', body: form });
  },
  /** Same upload with byte-level progress (fetch can't report upload progress). */
  uploadWithProgress: (file: File, meta: { title?: string; doi?: string }, onProgress: (fraction: number) => void): Promise<LibraryDocument> =>
    new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);
      if (meta.title) form.append('title', meta.title);
      if (meta.doi) form.append('doi', meta.doi);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/assets/upload`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      xhr.onerror = () => reject(new ApiError('Upload failed — check your connection and try again.', 0, 'NETWORK_ERROR'));
      xhr.onload = () => {
        let body: ApiResponse<LibraryDocument> | null = null;
        try { body = JSON.parse(xhr.responseText); } catch { /* non-JSON error page */ }
        if (xhr.status >= 200 && xhr.status < 300 && body?.data) resolve(body.data);
        else reject(new ApiError(body?.error?.message || body?.message || `Upload failed (${xhr.status})`, xhr.status, body?.error?.code));
      };
      xhr.send(form);
    }),
  getUserAssets: (): Promise<LibraryDocument[]> => fetchApi('/assets'),
  getDocument: (id: string): Promise<LibraryDocument> => fetchApi(`/assets/${id}`),
  update: (id: string, data: { title?: string; doi?: string | null; visibility?: 'private' | 'public' }): Promise<LibraryDocument> =>
    fetchApi(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAsset: (id: string) => fetchApi(`/assets/${id}`, { method: 'DELETE' }),
};
