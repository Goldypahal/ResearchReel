"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { SCIENTISTS } from '@/lib/scientists';

export interface Story {
  id: string;
  username: string;
  name: string;
  image: string;
  text?: string;
  gradient?: string;
  isCustom: boolean;
  quote?: string;
  field?: string;
  pseudocode?: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: string; // 'Me' or username
  timestamp: string;
  isOwn: boolean;
}

export interface ProfileDetails {
  username: string;
  full_name: string;
  bio: string;
  orcid_id: string;
  institution_name: string;
  research_interests: string[];
  verification_status: string;
}

interface SocialContextType {
  // Followers/Following
  followingMap: Record<string, string[]>; // user -> list of usernames they follow
  followersMap: Record<string, string[]>; // user -> list of usernames following them
  followUser: (follower: string, target: string) => void;
  unfollowUser: (follower: string, target: string) => void;
  isFollowing: (follower: string, target: string) => boolean;

  // Profiles
  profiles: Record<string, ProfileDetails>;
  updateProfile: (username: string, details: Partial<ProfileDetails>) => void;

  // Stories
  stories: Story[];
  addCustomStory: (text: string, gradient: string) => void;
  storyViews: Record<string, boolean>; // storyId -> viewed
  markStoryViewed: (storyId: string) => void;

  // DMs / Messages
  messagesMap: Record<string, ChatMessage[]>; // username -> chat messages
  sendDM: (targetUsername: string, text: string) => void;

  // Modals state
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isSwitchOpen: boolean;
  setIsSwitchOpen: (open: boolean) => void;
  isCreateStoryOpen: boolean;
  setIsCreateStoryOpen: (open: boolean) => void;
  isStoryViewerOpen: boolean;
  setIsStoryViewerOpen: (open: boolean) => void;
  activeStoryIndex: number;
  setActiveStoryIndex: (index: number) => void;

  isFollowsListOpen: boolean;
  setIsFollowsListOpen: (open: boolean) => void;
  followsListType: 'followers' | 'following';
  setFollowsListType: (type: 'followers' | 'following') => void;
  followsListUser: string;
  setFollowsListUser: (username: string) => void;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();

  // 1. Initialize Profiles
  const [profiles, setProfiles] = useState<Record<string, ProfileDetails>>({});

  // 2. Followers/Following maps
  const [followingMap, setFollowingMap] = useState<Record<string, string[]>>({});
  const [followersMap, setFollowersMap] = useState<Record<string, string[]>>({});

  // 3. Custom & scientist stories
  const [customStories, setCustomStories] = useState<Story[]>([]);
  const [storyViews, setStoryViews] = useState<Record<string, boolean>>({});

  // 4. Messages (DMs)
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({});

  // 5. Modals State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  const [isFollowsListOpen, setIsFollowsListOpen] = useState(false);
  const [followsListType, setFollowsListType] = useState<'followers' | 'following'>('followers');
  const [followsListUser, setFollowsListUser] = useState('');

  // Setup initial state from SCIENTISTS
  useEffect(() => {
    const initialProfiles: Record<string, ProfileDetails> = {};
    const initialFollowing: Record<string, string[]> = {};
    const initialFollowers: Record<string, string[]> = {};
    const initialMessages: Record<string, ChatMessage[]> = {};

    // Standard usernames helper
    const getUsername = (name: string) => name.toLowerCase().replace(/ /g, '_');

    // Add Julia Newton (default auth user)
    const juliaUsername = 'julianewton';
    initialProfiles[juliaUsername] = {
      username: juliaUsername,
      full_name: "Dr. Julia Newton",
      bio: "Lead Research Scientist specializing in neuro-symbolic reasoning and large scale transformer architectures for autonomous logic validation. Bridges the gap between neural performance and symbolic consistency.",
      orcid_id: "0000-0001-2345-6789",
      institution_name: "MIT CSAIL",
      research_interests: ["NeuroSymbolic", "Transformers", "LogicValidation", "ArtificialIntelligence"],
      verification_status: "scholar",
    };

    initialFollowing[juliaUsername] = [];
    initialFollowers[juliaUsername] = [];

    // Add Scientists
    SCIENTISTS.forEach((s) => {
      const u = getUsername(s.name);
      initialProfiles[u] = {
        username: u,
        full_name: s.name,
        bio: s.quote,
        orcid_id: `0000-0002-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        institution_name: s.field.split('&')[0].trim() + " Department",
        research_interests: s.field.split('&').map(part => part.trim().replace(/ /g, '')),
        verification_status: "scholar",
      };
      initialFollowing[u] = [];
      initialFollowers[u] = [];
      
      // Seed some starting messages
      initialMessages[u] = [
        {
          id: `msg-init-${u}-1`,
          text: `Hello! I noticed your latest publication on ${initialProfiles[juliaUsername].research_interests[0]}. Fascinating work!`,
          sender: u,
          timestamp: '10:30 AM',
          isOwn: false
        },
        {
          id: `msg-init-${u}-2`,
          text: `Thank you! I was heavily inspired by your work on ${s.field.split('&')[0]}.`,
          sender: 'Me',
          timestamp: '10:35 AM',
          isOwn: true
        }
      ];
    });

    // Create realistic follows:
    // Make Julia follow a few, and a few follow Julia
    const scientistUsernames = SCIENTISTS.map(s => getUsername(s.name));
    
    // Julia follows first 3
    initialFollowing[juliaUsername] = scientistUsernames.slice(0, 3);
    scientistUsernames.slice(0, 3).forEach(u => {
      initialFollowers[u].push(juliaUsername);
    });

    // Julia followed by next 3
    scientistUsernames.slice(3, 6).forEach(u => {
      initialFollowing[u].push(juliaUsername);
      initialFollowers[juliaUsername].push(u);
    });

    // Inter-scientist follows
    for (let i = 0; i < scientistUsernames.length; i++) {
      const u1 = scientistUsernames[i];
      // Follow the next 2 scientists in the circular list
      const u2 = scientistUsernames[(i + 1) % scientistUsernames.length];
      const u3 = scientistUsernames[(i + 2) % scientistUsernames.length];
      
      if (!initialFollowing[u1].includes(u2)) initialFollowing[u1].push(u2);
      if (!initialFollowers[u2].includes(u1)) initialFollowers[u2].push(u1);

      if (!initialFollowing[u1].includes(u3)) initialFollowing[u1].push(u3);
      if (!initialFollowers[u3].includes(u1)) initialFollowers[u3].push(u1);
    }

    setProfiles(initialProfiles);
    setFollowingMap(initialFollowing);
    setFollowersMap(initialFollowers);
    setMessagesMap(initialMessages);
  }, []);

  // Follow utility functions
  const followUser = (follower: string, target: string) => {
    if (!follower || !target || follower === target) return;
    setFollowingMap(prev => {
      const list = prev[follower] || [];
      if (list.includes(target)) return prev;
      return { ...prev, [follower]: [...list, target] };
    });
    setFollowersMap(prev => {
      const list = prev[target] || [];
      if (list.includes(follower)) return prev;
      return { ...prev, [target]: [...list, follower] };
    });
  };

  const unfollowUser = (follower: string, target: string) => {
    if (!follower || !target) return;
    setFollowingMap(prev => {
      const list = prev[follower] || [];
      return { ...prev, [follower]: list.filter(u => u !== target) };
    });
    setFollowersMap(prev => {
      const list = prev[target] || [];
      return { ...prev, [target]: list.filter(u => u !== follower) };
    });
  };

  const isFollowing = (follower: string, target: string) => {
    if (!follower || !target) return false;
    return followingMap[follower]?.includes(target) || false;
  };

  const updateProfile = (username: string, details: Partial<ProfileDetails>) => {
    setProfiles(prev => {
      const existing = prev[username];
      if (!existing) return prev;
      return {
        ...prev,
        [username]: { ...existing, ...details }
      };
    });

    // If updating current user's profile, sync to AuthContext too
    if (user && user.username === username) {
      updateUser({
        ...user,
        full_name: details.full_name || user.full_name,
        verification_status: details.verification_status || user.verification_status,
      });
    }
  };

  // Custom story adder
  const addCustomStory = (text: string, gradient: string) => {
    const activeUsername = user?.username || 'julianewton';
    const activeName = user?.full_name || 'Dr. Julia Newton';

    const newStory: Story = {
      id: `story-custom-${Date.now()}`,
      username: activeUsername,
      name: activeName,
      image: '/assets/scientists/tesla.png', // Fallback or user image
      text,
      gradient,
      isCustom: true,
      timestamp: 'Just now'
    };

    setCustomStories(prev => [newStory, ...prev]);
  };

  // Mark story as viewed
  const markStoryViewed = (storyId: string) => {
    setStoryViews(prev => ({ ...prev, [storyId]: true }));
  };

  // Send a direct message
  const sendDM = (targetUsername: string, text: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      text,
      sender: 'Me',
      timestamp,
      isOwn: true
    };

    setMessagesMap(prev => {
      const existing = prev[targetUsername] || [];
      return {
        ...prev,
        [targetUsername]: [...existing, newMsg]
      };
    });
  };

  // Combine scientist stories and custom stories
  const getUsername = (name: string) => name.toLowerCase().replace(/ /g, '_');
  const scientistStories: Story[] = SCIENTISTS.slice(0, 10).map((s) => ({
    id: `story-scientist-${getUsername(s.name)}`,
    username: getUsername(s.name),
    name: s.name,
    image: s.image,
    quote: s.quote,
    field: s.field,
    pseudocode: s.pseudocode,
    isCustom: false,
    timestamp: '2h ago'
  }));

  const allStories = [...customStories, ...scientistStories];

  return (
    <SocialContext.Provider value={{
      followingMap,
      followersMap,
      followUser,
      unfollowUser,
      isFollowing,
      profiles,
      updateProfile,
      stories: allStories,
      addCustomStory,
      storyViews,
      markStoryViewed,
      messagesMap,
      sendDM,

      // Modals
      isSettingsOpen,
      setIsSettingsOpen,
      isSwitchOpen,
      setIsSwitchOpen,
      isCreateStoryOpen,
      setIsCreateStoryOpen,
      isStoryViewerOpen,
      setIsStoryViewerOpen,
      activeStoryIndex,
      setActiveStoryIndex,
      isFollowsListOpen,
      setIsFollowsListOpen,
      followsListType,
      setFollowsListType,
      followsListUser,
      setFollowsListUser,
    }}>
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
