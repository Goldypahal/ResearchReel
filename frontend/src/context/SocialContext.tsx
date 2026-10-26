"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { messagesApi, notificationsApi, storiesApi, errorMessage, type Story } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export type { Story };

interface SocialContextType {
  // Stories (24h updates from you and the people you follow)
  stories: Story[];
  storiesLoading: boolean;
  storiesError: string | null;
  refreshStories: () => Promise<void>;
  createStory: (text: string, gradient: string) => Promise<Story>;
  markStoryViewed: (storyId: string) => void;

  // Live badges
  unreadNotifications: number;
  unreadMessages: number;
  refreshBadges: () => Promise<void>;
  setUnreadNotifications: (n: number) => void;

}

const SocialContext = createContext<SocialContextType | undefined>(undefined);
const BADGE_POLL_MS = 60_000;

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [stories, setStories] = useState<Story[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);


  const refreshStories = useCallback(async () => {
    if (!user) return;
    setStoriesLoading(true);
    setStoriesError(null);
    try {
      setStories(await storiesApi.list());
    } catch (err) {
      setStoriesError(errorMessage(err, 'Could not load stories.'));
    } finally {
      setStoriesLoading(false);
    }
  }, [user]);

  const refreshBadges = useCallback(async () => {
    if (!user) return;
    const [notifs, convs] = await Promise.allSettled([notificationsApi.unreadCount(), messagesApi.getConversations()]);
    if (notifs.status === 'fulfilled') setUnreadNotifications(notifs.value);
    if (convs.status === 'fulfilled') setUnreadMessages(convs.value.reduce((n, c) => n + (c.unread_count || 0), 0));
  }, [user]);

  // Load on sign-in, clear on sign-out, poll badges while the tab is open.
  useEffect(() => {
    if (!user) {
       
      // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
      setStories([]);
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }
    refreshStories();
    refreshBadges();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshBadges();
    }, BADGE_POLL_MS);

    const socket = getSocket();
    const onMessage = () => refreshBadges();
    socket.on('new_message', onMessage);
    return () => {
      window.clearInterval(interval);
      socket.off('new_message', onMessage);
    };
  }, [user, refreshStories, refreshBadges]);

  const createStory = useCallback(async (text: string, gradient: string) => {
    const created = await storiesApi.create(text, gradient);
    await refreshStories();
    return created;
  }, [refreshStories]);

  const markStoryViewed = useCallback((storyId: string) => {
    setStories((prev) => prev.map((s) => (s.id === storyId ? { ...s, viewed: true } : s)));
    storiesApi.markViewed(storyId);
  }, []);

  return (
    <SocialContext.Provider
      value={{
        stories,
        storiesLoading,
        storiesError,
        refreshStories,
        createStory,
        markStoryViewed,
        unreadNotifications,
        unreadMessages,
        refreshBadges,
        setUnreadNotifications,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (context === undefined) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
};
