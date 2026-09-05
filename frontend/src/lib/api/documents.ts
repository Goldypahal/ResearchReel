import { fetchApi } from './client';

export interface UploadUrlResponse {
  uploadUrl: string;
  storageKey: string;
  bucket: string;
}

export interface RegisterAssetPayload {
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  storageKey: string;
  fileUrl?: string;
  metadata?: Record<string, any>;
}

export interface DocumentItem {
  id: string;
  owner_id: string;
  title: string;
  abstract?: string;
  doi?: string;
  publication_year?: number;
  journal?: string;
  file_url: string;
  storage_key: string;
  mime_type: string;
  file_size: number;
  status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
  visibility: string;
  created_at: string;
}

export const documentsApi = {
  getUploadUrl: (fileName: string, mimeType: string = 'application/pdf'): Promise<UploadUrlResponse> =>
    fetchApi('/assets/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, mimeType }),
    }),

  uploadFileToStorage: async (uploadUrl: string, file: File): Promise<boolean> => {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/pdf',
      },
      body: file,
    });
    return res.ok;
  },

  registerAsset: (payload: RegisterAssetPayload): Promise<DocumentItem> =>
    fetchApi('/assets/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getUserAssets: (): Promise<DocumentItem[]> => fetchApi('/assets'),

  deleteAsset: (id: string) =>
    fetchApi(`/assets/${id}`, {
      method: 'DELETE',
    }),
};
