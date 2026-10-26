import { fetchApi } from './client';
import type { CurrentUser } from './types';

export interface AuthResult {
  user?: CurrentUser;
  token?: string;
  email?: string;
  requiresVerification?: boolean;
}

export const authApi = {
  register: (payload: { email: string; username: string; password: string; full_name: string }): Promise<AuthResult> =>
    fetchApi('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  verifyOtp: (email: string, otp: string): Promise<AuthResult> =>
    fetchApi('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  login: (email: string, password: string): Promise<AuthResult> =>
    fetchApi('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => fetchApi('/auth/logout', { method: 'POST' }),
  resendOtp: (email: string): Promise<{ email: string }> =>
    fetchApi('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (email: string): Promise<{ email: string }> =>
    fetchApi('/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email: string, code: string, new_password: string): Promise<null> =>
    fetchApi('/auth/password/reset', { method: 'POST', body: JSON.stringify({ email, code, new_password }) }),
  /** Sends a 6-digit code to a university email address. */
  verifyStudent: (email: string): Promise<{ email: string }> =>
    fetchApi('/auth/verify/student', { method: 'POST', body: JSON.stringify({ email }) }),
  confirmStudent: (code: string): Promise<{ verification_status: string; institution?: string | null }> =>
    fetchApi('/auth/verify/student/confirm', { method: 'POST', body: JSON.stringify({ code }) }),
  /** Returns the ORCID authorize URL to send the browser to. */
  orcidStart: (): Promise<{ url: string }> => fetchApi('/auth/orcid/start', { method: 'POST' }),
  orcidDisconnect: () => fetchApi('/auth/orcid', { method: 'DELETE' }),

  sessions: (): Promise<Session[]> => fetchApi('/auth/sessions'),
  revokeSession: (id: string) => fetchApi(`/auth/sessions/${id}`, { method: 'DELETE' }),
  revokeOtherSessions: (): Promise<{ revoked: number }> => fetchApi('/auth/sessions/revoke-others', { method: 'POST' }),
  changePassword: (current_password: string, new_password: string): Promise<{ revoked: number }> =>
    fetchApi('/auth/password', { method: 'PUT', body: JSON.stringify({ current_password, new_password }) }),
};

export interface Session {
  id: string;
  device_name?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  last_used_at?: string | null;
  expires_at: string;
  current: boolean;
}
