"use client";

import { useState } from 'react';
import { usersApi, errorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  username: string;
  initialFollowing: boolean;
  onChange?: (following: boolean) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/** Optimistic follow/unfollow that rolls back if the request fails. */
export default function FollowButton({ username, initialFollowing, onChange, size = 'md', className }: FollowButtonProps) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  if (!user || user.username === username) return null;

  const toggle = async () => {
    const next = !following;
    setFollowing(next);
    setBusy(true);
    try {
      if (next) await usersApi.follow(username);
      else await usersApi.unfollow(username);
      onChange?.(next);
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
      aria-pressed={following}
      className={cn(
        'rounded-lg font-semibold transition-colors disabled:opacity-60',
        size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
        following
          ? 'border border-[var(--border)] bg-transparent hover:border-red-500/40 hover:text-red-400'
          : 'bg-indigo-600 text-white hover:bg-indigo-500',
        className
      )}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
