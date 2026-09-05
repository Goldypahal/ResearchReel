import { fetchApi } from './client';

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  full_name: string;
}

export interface VerifyOTPPayload {
  email: string;
  otp: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyOTP: (payload: VerifyOTPPayload) =>
    fetchApi('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    fetchApi('/auth/logout', {
      method: 'POST',
    }),

  refreshToken: () =>
    fetchApi('/auth/refresh', {
      method: 'POST',
    }),
};
