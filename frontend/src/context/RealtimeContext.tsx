"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { authApi, messagesApi, notificationsApi, type Notification } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

/**
 * Socket.io connection for live notifications, messages and lecture chat.
 * By default it connects to this site's own origin (proxied to the API by next.config);
 * set NEXT_PUBLIC_SOCKET_URL only if the API is reachable on a different public URL.
 */
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;

type Handler = (payload: unknown) => void;

interface RealtimeContextType {
  connected: boolean;
  unreadNotifications: number;
  unreadMessages: number;
  setUnreadNotifications: (n: number) => void;
  refreshCounts: () => void;
  on: (event: string, handler: Handler) => () => void;
  emit: (event: string, ...args: unknown[]) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const handlers = useRef(new Map<string, Set<Handler>>());
  const [connected, setConnected] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const refreshCounts = useCallback(() => {
    notificationsApi.unreadCount().then((r) => setUnreadNotifications(r.count)).catch(() => {});
    messagesApi.unreadCount().then((r) => setUnreadMessages(r.count)).catch(() => {});
  }, []);

  const dispatch = useCallback((event: string, payload: unknown) => {
    handlers.current.get(event)?.forEach((h) => h(payload));
  }, []);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }
    let cancelled = false;
    refreshCounts();

    const connect = async () => {
      let token: string;
      try { token = (await authApi.socketToken()).token; } catch { return; }
      if (cancelled) return;
      const opts = { path: '/socket.io', auth: { token }, transports: ['websocket', 'polling'], withCredentials: true };
      const socket = SOCKET_URL ? io(SOCKET_URL, opts) : io(opts);
      socketRef.current = socket;
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', async (err) => {
        if (err.message === 'unauthorized') {
          try { socket.auth = { token: (await authApi.socketToken()).token }; } catch { /* signed out */ }
        }
      });
      socket.onAny((event, payload) => dispatch(event, payload));
      socket.on('notification', (n: Notification) => {
        setUnreadNotifications((c) => c + 1);
        if (n.type === 'reel_ready' || n.type === 'reel_failed') {
          toast({ title: n.type === 'reel_ready' ? 'Your reel is live' : 'Reel processing failed', description: n.message || undefined, variant: n.type === 'reel_ready' ? 'success' : 'destructive', duration: 6000 });
        }
      });
      socket.on('message_notification', () => {
        if (!window.location.pathname.startsWith('/messages')) setUnreadMessages((c) => c + 1);
      });
    };
    connect();

    // Fallback polling keeps badges fresh if websockets are blocked.
    const interval = setInterval(refreshCounts, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user, refreshCounts, dispatch]);

  const on = useCallback((event: string, handler: Handler) => {
    if (!handlers.current.has(event)) handlers.current.set(event, new Set());
    handlers.current.get(event)!.add(handler);
    return () => { handlers.current.get(event)?.delete(handler); };
  }, []);

  const emit = useCallback((event: string, ...args: unknown[]) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  return (
    <RealtimeContext.Provider value={{ connected, unreadNotifications, unreadMessages, setUnreadNotifications, refreshCounts, on, emit }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useRealtime = () => {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
};
