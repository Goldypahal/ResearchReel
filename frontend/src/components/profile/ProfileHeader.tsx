"use client";

import React, { useState } from 'react';
import { CheckCircle, Lock, Settings, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocial } from '@/context/SocialContext';
import FollowModal from './FollowModal';
import SettingsModal from './SettingsModal';

interface User {
  username: string;
  full_name: string;
  bio: string;
  verification_status: string;
  orcid_id?: string;
  institution_name?: string;
  research_interests?: string[];
  follower_count: number;
  post_count: number;
}

interface ProfileHeaderProps {
  user: User;
  onImportPapers?: () => void;
}

export default function ProfileHeader({ user, onImportPapers }: ProfileHeaderProps) {
  const { user: currentUser } = useAuth();
  const { followersMap, followingMap, followUser, unfollowUser, isFollowing } = useSocial();
  const [followModalConfig, setFollowModalConfig] = useState<{ isOpen: boolean; type: 'followers' | 'following' }>({
    isOpen: false,
    type: 'followers',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isOwnProfile = currentUser?.username === user.username;
  const canImport = isOwnProfile && (currentUser?.role === 'professor' || currentUser?.role === 'scholar');
  const followerCount = followersMap[user.username]?.length ?? user.follower_count;
  const followingCount = followingMap[user.username]?.length ?? 0;
  const viewerIsFollowing = currentUser ? isFollowing(currentUser.username, user.username) : false;

  const toggleFollow = () => {
    if (!currentUser) return;
    if (viewerIsFollowing) {
      unfollowUser(currentUser.username, user.username);
    } else {
      followUser(currentUser.username, user.username);
    }
  };

  return (
    <div className="w-full max-w-[935px] mx-auto px-4 pb-8 pt-7 border-b border-[var(--border)]/10 transition-all">
      <div className="flex items-start gap-5 md:gap-10">
        <div className="relative h-20 w-20 shrink-0 md:h-36 md:w-36">
          <div className="h-full w-full rounded-full border border-[var(--border)]/15 bg-[var(--foreground)]/[0.04] p-1">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-indigo-500/10 text-3xl font-black text-indigo-400 md:text-5xl">
              {user.full_name.slice(0, 1)}
            </div>
          </div>
          {user.verification_status === 'scholar' && (
            <div className="absolute bottom-0 right-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-[var(--background)] bg-indigo-500 text-white shadow-lg md:right-4">
              <CheckCircle size={14} fill="white" className="text-indigo-500" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 text-[var(--foreground)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <h2 className="truncate text-xl font-semibold tracking-tight lowercase md:text-2xl">{user.username}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {isOwnProfile ? (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="h-8 rounded-lg border border-[var(--border)]/10 bg-[var(--foreground)]/8 px-4 text-xs font-bold text-[var(--foreground)] transition-all hover:bg-[var(--foreground)]/12 active:scale-95"
                >
                  Edit profile
                </button>
              ) : currentUser?.role !== 'viewer' ? (
                <>
                  <button
                    onClick={toggleFollow}
                    className={`h-8 rounded-lg px-4 text-xs font-bold transition-all active:scale-95 ${
                      viewerIsFollowing
                        ? 'bg-[var(--foreground)]/8 text-[var(--foreground)] hover:bg-[var(--foreground)]/12'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    }`}
                  >
                    {viewerIsFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button className="h-8 rounded-lg border border-[var(--border)]/10 bg-[var(--foreground)]/8 px-4 text-xs font-bold text-[var(--foreground)] transition-all hover:bg-[var(--foreground)]/12 active:scale-95">
                    Message
                  </button>
                </>
              ) : (
                <div className="flex h-8 items-center gap-2 rounded-lg border border-dashed border-zinc-500/20 bg-zinc-500/5 px-4">
                  <Lock size={12} className="text-zinc-500" />
                  <span className="text-[11px] font-bold text-zinc-500">Contact restricted</span>
                </div>
              )}

              {canImport && onImportPapers && (
                <button
                  onClick={onImportPapers}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-600/10 px-3 text-xs font-bold text-emerald-400 transition-all hover:border-emerald-500/40 hover:bg-emerald-600/20 active:scale-95"
                  title="Import your research papers via DOI or ORCID"
                >
                  <Upload size={12} />
                  <span>Import</span>
                </button>
              )}

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="rounded-full border border-transparent p-2 transition-all hover:border-[var(--border)]/10 hover:bg-[var(--foreground)]/5"
                aria-label="Open settings"
              >
                <Settings size={18} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-5 md:gap-9">
            <div className="text-sm">
              <span className="mr-1 font-bold">{user.post_count.toLocaleString()}</span>
              <span>post{user.post_count === 1 ? '' : 's'}</span>
            </div>
            <button
              type="button"
              className="text-sm transition-opacity hover:opacity-70"
              onClick={() => setFollowModalConfig({ isOpen: true, type: 'followers' })}
            >
              <span className="mr-1 font-bold">{followerCount.toLocaleString()}</span>
              <span>followers</span>
            </button>
            <button
              type="button"
              className="text-sm transition-opacity hover:opacity-70"
              onClick={() => setFollowModalConfig({ isOpen: true, type: 'following' })}
            >
              <span className="mr-1 font-bold">{followingCount.toLocaleString()}</span>
              <span>following</span>
            </button>
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <h1 className="text-sm font-bold">{user.full_name}</h1>
              <div className="text-xs text-zinc-500">{user.institution_name} · Scholar</div>
            </div>
            <p className="max-w-lg text-sm leading-relaxed opacity-85">{user.bio}</p>
            <div className="flex flex-wrap gap-2 pt-1 text-xs font-semibold text-indigo-500">
              {user.research_interests?.map(tag => (
                <span key={tag} className="cursor-pointer hover:underline">#{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <FollowModal
        isOpen={followModalConfig.isOpen}
        type={followModalConfig.type}
        onClose={() => setFollowModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
