"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Users, X } from 'lucide-react';
import { errorMessage, usersApi, type UserCard } from '@/lib/api';
import UserRow from '@/components/common/UserRow';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/common/States';

interface FollowModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'followers' | 'following';
  username: string;
}

export default function FollowModal({ isOpen, onClose, type, username }: FollowModalProps) {
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState<UserCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
    setPeople(null);
    setError(null);
    setSearch('');
    (type === 'followers' ? usersApi.getFollowers(username) : usersApi.getFollowing(username))
      .then((rows) => { if (!cancelled) setPeople(rows); })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)); });
    return () => { cancelled = true; };
  }, [isOpen, type, username]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !people) return people;
    return people.filter((p) => p.username.toLowerCase().includes(q) || (p.full_name || '').toLowerCase().includes(q));
  }, [people, search]);

  if (!isOpen) return null;
  const title = type === 'followers' ? 'Followers' : 'Following';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 flex h-[70vh] max-h-[520px] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <div className="w-8" />
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--foreground)]/5">
            <X size={20} />
          </button>
        </div>

        {people && people.length > 6 && (
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search"
                aria-label={`Search ${title.toLowerCase()}`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--foreground)]/5 py-2 pl-9 pr-4 text-sm focus:border-indigo-500/50 focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {error ? (
            <ErrorState message={error} />
          ) : !filtered ? (
            <SkeletonRows rows={5} className="pt-2" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users size={20} />}
              title={search ? 'No matches' : type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              className="mt-4 border-0"
            />
          ) : (
            filtered.map((p) => <UserRow key={p.id} user={p} onNavigate={onClose} />)
          )}
        </div>
      </div>
    </div>
  );
}
