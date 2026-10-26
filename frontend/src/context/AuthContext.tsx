"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initAnalytics, trackEvent, identifyUser, resetAnalytics } from '@/lib/analytics';
import { initSentry } from '@/lib/sentry';
import { authApi, usersApi, SESSION_EXPIRED_EVENT, type CurrentUser } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import { requiresAuth } from '@/lib/routes';

export type UserRole = 'student' | 'professor' | 'scholar' | 'viewer' | 'admin' | 'moderator' | 'user';

export type User = CurrentUser;

interface AuthContextType {
  /** Sessions live in httpOnly cookies, so there is no token in JS; `user` is the signed-in check. */
  user: User | null;
  isLoading: boolean;
  login: (userData: User, token?: string) => void;
  logout: () => Promise<void>;
  updateUser: (userData: User) => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const CACHE_KEY = 'user';

const readCachedUser = (): User | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const persist = useCallback((next: User | null) => {
    setUser(next);
    try {
      if (next) localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      else localStorage.removeItem(CACHE_KEY);
    } catch {
      // storage unavailable (private mode) – the session cookie is still the source of truth
    }
  }, []);

  const clearSession = useCallback(() => {
    persist(null);
    disconnectSocket();
    resetAnalytics();
  }, [persist]);

  /** Asks the API who we are; the cookie session is authoritative, the cache is only for first paint. */
  const refreshUser = useCallback(async () => {
    try {
      const me = await usersApi.getMe();
      persist(me);
      identifyUser(me.id, me.email, { username: me.username, role: me.role });
      return me;
    } catch {
      clearSession();
      return null;
    }
  }, [persist, clearSession]);

  useEffect(() => {
    initAnalytics();
    initSentry();
    localStorage.removeItem('token'); // legacy insecure storage from older builds

    const cached = readCachedUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cached) setUser(cached);
    refreshUser().finally(() => setIsLoading(false));

    // Signed-out visitors also hit 401 on the initial /users/me check; only bounce
    // pages that actually need a session.
    const onExpired = () => {
      clearSession();
      if (!requiresAuth(window.location.pathname)) return;
      const here = window.location.pathname + window.location.search;
      router.replace(`/auth/login?next=${encodeURIComponent(here)}`);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [refreshUser, clearSession, router]);

  const login = useCallback((userData: User) => {
    persist(userData);
    identifyUser(userData.id, userData.email, { username: userData.username, role: userData.role });
    trackEvent('login', { userId: userData.id });
  }, [persist]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if the network call fails, drop local state; the cookie expires on its own.
    }
    clearSession();
    router.push('/');
  }, [clearSession, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        updateUser: persist,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
