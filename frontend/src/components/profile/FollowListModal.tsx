"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal, Avatar, Spinner, LoadMore, VerifiedBadge } from '@/components/common';
import FollowButton from '@/components/common/FollowButton';
import { usersApi, type PublicUser } from '@/lib/api';

export default function FollowListModal({ username, type, open, onClose }: { username: string; type: 'followers' | 'following'; open: boolean; onClose: () => void }) {
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUsers(null);
    const fn = type === 'followers' ? usersApi.followers : usersApi.following;
    fn(username).then((r) => { setUsers(r.users); setCursor(r.nextCursor); }).catch(() => setUsers([]));
  }, [open, type, username]);

  const more = useCallback(async () => {
    if (!cursor) return;
    setLoadingMore(true);
    const fn = type === 'followers' ? usersApi.followers : usersApi.following;
    try { const r = await fn(username, cursor); setUsers((u) => [...(u || []), ...r.users]); setCursor(r.nextCursor); } finally { setLoadingMore(false); }
  }, [cursor, type, username]);

  return (
    <Modal open={open} onClose={onClose} title={type === 'followers' ? 'Followers' : 'Following'}>
      <div className="p-3 max-h-[60vh] overflow-y-auto">
        {users === null ? <Spinner /> : users.length === 0 ? <p className="text-sm text-zinc-500 text-center py-8">{type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p> : (
          <ul>
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-2 py-2.5">
                <Link href={`/profile/${u.username}`} onClick={onClose}><Avatar src={u.avatar_url} name={u.full_name} size={40} /></Link>
                <Link href={`/profile/${u.username}`} onClick={onClose} className="flex-1 min-w-0">
                  <p className="text-sm font-semibold flex items-center gap-1 truncate">{u.full_name} <VerifiedBadge status={u.verification_status} /></p>
                  <p className="text-xs text-zinc-500 truncate">@{u.username}</p>
                </Link>
                <FollowButton username={u.username} initial={Boolean(u.is_following)} size="sm" />
              </li>
            ))}
          </ul>
        )}
        <LoadMore onVisible={more} loading={loadingMore} hasMore={Boolean(cursor)} />
      </div>
    </Modal>
  );
}
