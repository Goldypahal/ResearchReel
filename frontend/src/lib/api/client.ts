export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
/** Origin of the API server (for Socket.IO and /uploads). */
export const API_ORIGIN = (process.env.NEXT_PUBLIC_WSS_URL || new URL(API_BASE_URL).origin).replace(/^ws/, 'http');

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  nextCursor?: string | null;
  error?: { code: string; message: string };
  requestId?: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export class ApiError extends Error {
  code: string;
  statusCode: number;
  requestId?: string;

  constructor(message: string, statusCode: number, code: string = 'API_ERROR', requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.requestId = requestId;
  }
}

/** Fired when the session can no longer be refreshed; AuthContext listens and signs out. */
export const SESSION_EXPIRED_EVENT = 'researchreel:session-expired';

let refreshInFlight: Promise<boolean> | null = null;

/** Rotates the refresh cookie once, sharing the result between concurrent 401s. */
function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        setTimeout(() => { refreshInFlight = null; }, 0);
      });
  }
  return refreshInFlight;
}

const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/verify-otp', '/auth/resend-otp', '/auth/password/', '/auth/refresh', '/auth/logout', '/notifications/unsubscribe'];

async function request<T>(endpoint: string, options: RequestInit, retried: boolean): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers, credentials: 'include' });
  } catch {
    throw new ApiError('Could not reach ResearchReel. Check your connection and try again.', 0, 'NETWORK_ERROR');
  }

  if (response.status === 401 && !retried && !NO_REFRESH.some((p) => endpoint.startsWith(p))) {
    if (await refreshSession()) return request<T>(endpoint, options, true);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  let payload: ApiResponse<T>;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) throw new ApiError(`Request failed (${response.status})`, response.status);
    return { success: true } as ApiResponse<T>;
  }

  if (!response.ok || payload.success === false) {
    const errorMsg = payload.error?.message || payload.message || 'Something went wrong. Please try again.';
    throw new ApiError(errorMsg, response.status, payload.error?.code || 'REQUEST_FAILED', payload.requestId);
  }
  return payload;
}

/** Returns the `data` field of a standard API response. */
export async function fetchApi<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const payload = await request<T>(endpoint, options, false);
  return (payload.data !== undefined ? payload.data : payload) as T;
}

/** For cursor-paginated endpoints that return `{ data: [...], nextCursor }`. */
export async function fetchPage<T>(endpoint: string): Promise<Page<T>> {
  const payload = await request<T[]>(endpoint, {}, false);
  return { items: (payload.data as T[]) || [], nextCursor: payload.nextCursor ?? null };
}

export const qs = (params: Record<string, string | number | boolean | null | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}` : '';
};

export const errorMessage = (err: unknown, fallback = 'Something went wrong. Please try again.') =>
  err instanceof Error && err.message ? err.message : fallback;

/** Full response envelope, for endpoints that return extra top-level fields. */
export async function fetchEnvelope<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T> & Record<string, unknown>> {
  return request<T>(endpoint, options, false) as Promise<ApiResponse<T> & Record<string, unknown>>;
}
