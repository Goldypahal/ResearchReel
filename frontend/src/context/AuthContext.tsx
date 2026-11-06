"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initAnalytics, identifyUser, resetAnalytics, trackEvent } from '@/lib/analytics';
import { initSentry } from '@/lib/sentry';
import { authApi, usersApi, onSessionExpired, refreshSession, ApiError, type CurrentUser } from '@/lib/api';

interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  /** Store a freshly-authenticated user (after login / OTP verification). */
  login: (user: CurrentUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (partial: Partial<CurrentUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadSession = useCallback(async () => {
    try {
      // Probe without the global "session expired" handling: being signed out is normal here.
      let me: CurrentUser;
      try {
        me = await usersApi.me(true);
      } catch (err) {
        if (!(err instanceof ApiError && err.statusCode === 401) || !(await refreshSession())) throw err;
        me = await usersApi.me(true);
      }
      setUser(me);
      identifyUser(me.id, me.email, { username: me.username, role: me.role });
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAnalytics();
    initSentry();
    // Clean up storage keys written by older versions of the app.
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch { /* storage unavailable */ }
    loadSession();
  }, [loadSession]);

  useEffect(() => onSessionExpired(() => {
    setUser(null);
    const path = window.location.pathname;
    if (path !== '/' && !path.startsWith('/auth')) {
      router.replace(`/auth/login?next=${encodeURIComponent(path + window.location.search)}`);
    }
  }), [router]);

  const login = useCallback((u: CurrentUser) => {
    setUser(u);
    identifyUser(u.id, u.email, { username: u.username, role: u.role });
    trackEvent('login', { userId: u.id });
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* already signed out */ }
    setUser(null);
    resetAnalytics();
    router.replace('/');
  }, [router]);

  const refreshUser = useCallback(async () => {
    try { setUser(await usersApi.me()); } catch { /* keep current */ }
  }, []);

  const updateUser = useCallback((partial: Partial<CurrentUser>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
