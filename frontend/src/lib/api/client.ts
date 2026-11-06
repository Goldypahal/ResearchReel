/**
 * API client. All requests go to same-origin `/api/v1` (proxied to the backend by
 * next.config rewrites) with cookies. On a 401 the client refreshes the session once
 * and retries; if that fails the user is signed out.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string; message: string; [k: string]: unknown };
  requestId?: string;
}

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(message: string, statusCode: number, code = 'API_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

type SessionListener = () => void;
const expiredListeners = new Set<SessionListener>();
export const onSessionExpired = (fn: SessionListener) => {
  expiredListeners.add(fn);
  return () => { expiredListeners.delete(fn); };
};

let refreshing: Promise<boolean> | null = null;
export const refreshSession = (): Promise<boolean> => {
  if (!refreshing) {
    refreshing = fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => { setTimeout(() => { refreshing = null; }, 0); });
  }
  return refreshing;
};

const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/verify-otp', '/auth/logout', '/auth/forgot-password', '/auth/reset-password', '/auth/resend-otp'];

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Do not try to refresh the session on 401 (used for the initial session probe). */
  skipRefresh?: boolean;
}

export async function fetchApi<T = unknown>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  let body: BodyInit | undefined;
  if (options.body instanceof FormData || typeof options.body === 'string' || options.body instanceof Blob) {
    body = options.body as BodyInit;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  const doFetch = () => fetch(url, { ...options, headers, body, credentials: 'include' });

  let response: Response;
  try {
    response = await doFetch();
  } catch {
    throw new ApiError('Network error. Check your connection and try again.', 0, 'NETWORK_ERROR');
  }

  if (response.status === 401 && !options.skipRefresh && !NO_REFRESH.some((p) => endpoint.startsWith(p))) {
    const ok = await refreshSession();
    if (ok) {
      response = await doFetch();
    } else {
      expiredListeners.forEach((fn) => fn());
    }
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    const message = payload?.error?.message || payload?.message || (response.status >= 500 ? 'Something went wrong on our side. Please try again.' : `Request failed (${response.status})`);
    throw new ApiError(message, response.status, payload?.error?.code || 'REQUEST_FAILED', payload?.error as Record<string, unknown> | undefined);
  }

  return (payload && payload.data !== undefined ? payload.data : payload) as T;
}

/**
 * Public URL of the API for large uploads (optional). When set, files go straight to
 * the API with a short-lived upload token instead of through the web server's proxy.
 */
const UPLOAD_BASE_URL = (process.env.NEXT_PUBLIC_UPLOAD_URL || '').replace(/\/$/, '');

const getUploadToken = async (): Promise<string | null> => {
  if (!UPLOAD_BASE_URL) return null;
  try {
    const r = await fetchApi<{ token: string }>('/auth/upload-token');
    return r.token;
  } catch {
    return null;
  }
};

/** Multipart upload with progress reporting (fetch has no upload progress). */
export async function uploadWithProgress<T = unknown>(
  endpoint: string,
  form: FormData,
  onProgress?: (fraction: number) => void,
  retried = false
): Promise<T> {
  const uploadToken = await getUploadToken();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    if (uploadToken) {
      xhr.open('POST', `${UPLOAD_BASE_URL}/api/v1${endpoint}`);
      xhr.setRequestHeader('Authorization', `Bearer ${uploadToken}`);
    } else {
      xhr.open('POST', `${API_BASE_URL}${endpoint}`);
      xhr.withCredentials = true;
    }
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onerror = () => reject(new ApiError('Upload failed. Check your connection and try again.', 0, 'NETWORK_ERROR'));
    xhr.onload = async () => {
      let payload: ApiEnvelope<T> | null = null;
      try { payload = JSON.parse(xhr.responseText); } catch { payload = null; }
      if (xhr.status === 401 && !retried) {
        if (await refreshSession()) {
          uploadWithProgress<T>(endpoint, form, onProgress, true).then(resolve, reject);
          return;
        }
        expiredListeners.forEach((fn) => fn());
      }
      if (xhr.status >= 400 || payload?.success === false) {
        const msg = payload?.error?.message || payload?.message || (xhr.status === 413 ? 'That file is too large.' : `Upload failed (${xhr.status})`);
        reject(new ApiError(msg, xhr.status, payload?.error?.code || 'REQUEST_FAILED'));
        return;
      }
      resolve((payload?.data ?? payload) as T);
    };
    xhr.send(form);
  });
}

export const errorMessage = (err: unknown, fallback = 'Something went wrong. Please try again.') =>
  err instanceof Error && err.message ? err.message : fallback;
