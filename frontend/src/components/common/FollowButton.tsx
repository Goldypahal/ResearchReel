"use client";

import React, { useState } from 'react';
import { usersApi, errorMessage } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export default function FollowButton({ username, initial, onChange, size = 'md' }: {
  username: string; initial: boolean; onChange?: (following: boolean, followers?: number) => void; size?: 'sm' | 'md';
}) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  if (!user || user.username === username) return null;

  const toggle = async () => {
    setBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      const r = next ? await usersApi.follow(username) : await usersApi.unfollow(username);
      onChange?.(r.is_following, r.followers_count);
    } catch (err) {
      setFollowing(!next);
      toast({ title: 'Could not update follow', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        'rounded-lg font-semibold transition-colors disabled:opacity-60 shrink-0',
        size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
        following ? 'bg-[var(--foreground)]/10 hover:bg-[var(--foreground)]/15 text-[var(--foreground)]' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
      )}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
