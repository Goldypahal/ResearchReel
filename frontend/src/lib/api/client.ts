const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  requestId?: string;
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

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Ensure HttpOnly cookies are sent/received
  };

  const response = await fetch(url, config);
  let payload: ApiResponse<T>;

  try {
    payload = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new ApiError(`HTTP Error ${response.status}`, response.status);
    }
    return {} as T;
  }

  if (!response.ok || payload.success === false) {
    const errorMsg = payload.error?.message || payload.message || 'An error occurred during API request';
    const errorCode = payload.error?.code || 'REQUEST_FAILED';
    throw new ApiError(errorMsg, response.status, errorCode, payload.requestId);
  }

  return (payload.data !== undefined ? payload.data : payload) as T;
}
