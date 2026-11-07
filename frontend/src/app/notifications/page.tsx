"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Film, AlertTriangle, Users, Calendar, ListChecks, Trash2 } from 'lucide-react';
import { notificationsApi, errorMessage, type Notification } from '@/lib/api';
import { Avatar, Spinner, ErrorState, EmptyState, LoadMore } from '@/components/common';
import FollowButton from '@/components/common/FollowButton';
import { useRealtime } from '@/context/RealtimeContext';
import { timeAgo } from '@/lib/format';

const describe = (n: Notification): { text: string; href: string | null } => {
  const target = n.entity_type === 'post' ? `/post/${n.entity_id}` : n.entity_type === 'video' ? `/reels?id=${n.entity_id}` : null;
  switch (n.type) {
    case 'follow': return { text: 'started following you.', href: `/profile/${n.actor_username}` };
    case 'like': return { text: n.entity_type === 'video' ? 'liked your reel.' : 'liked your post.', href: target };
    case 'comment': return { text: `commented: “${n.message || ''}”`, href: target };
    case 'mention': return { text: n.message ? `mentioned you: “${n.message}”` : 'mentioned you in a post.', href: target };
    case 'reply': return { text: `replied to your comment: “${n.message || ''}”`, href: target };
    case 'project_invite': return { text: `added you to the project “${n.message || ''}”.`, href: `/projects/${n.entity_id}` };
    case 'task_assigned': return { text: `assigned you a task${n.message ? `: “${n.message}”` : ''}.`, href: `/projects/${n.entity_id}` };
    case 'lecture_live': return { text: `is live now: ${n.message || 'lecture'}`, href: `/lectures/${n.entity_id}` };
    case 'lecture_reminder': return { text: n.message === '1h' ? 'Your lecture starts in about an hour.' : 'Reminder: a lecture you registered for is coming up.', href: `/lectures/${n.entity_id}` };
    case 'lecture_cancelled': return { text: `cancelled the lecture “${n.message || ''}”.`, href: '/lectures' };
    case 'lecture_rsvp': return { text: `registered for your lecture “${n.message || ''}”.`, href: `/lectures/${n.entity_id}` };
    case 'reel_ready': return { text: n.message || 'Your reel is live.', href: target };
    case 'reel_failed': return { text: n.message || 'A reel failed to process.', href: '/reels/generator' };
    case 'content_removed': return { text: n.message || 'Some of your content was removed by a moderator.', href: '/support#guidelines' };
    default: return { text: n.message || 'New activity.', href: target };
  }
};

const SystemIcon = ({ type }: { type: string }) => {
  const Icon = type.startsWith('reel') ? Film : type === 'content_removed' ? AlertTriangle : type.startsWith('lecture') ? Calendar : type.startsWith('task') ? ListChecks : type.startsWith('project') ? Users : Bell;
  return <div className="w-11 h-11 rounded-full bg-indigo-500/15 text-indigo-300 flex items-center justify-center shrink-0"><Icon size={18} /></div>;
};

export default function NotificationsPage() {
  const { setUnreadNotifications, on } = useRealtime();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await notificationsApi.list();
      setItems(r.notifications); setCursor(r.nextCursor);
      if (r.unread_count > 0) { await notificationsApi.markRead(); setUnreadNotifications(0); }
    } catch (err) { setError(errorMessage(err)); }
  }, [setUnreadNotifications]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => on('notification', (n) => {
    setItems((prev) => [n as Notification, ...(prev || [])]);
    notificationsApi.markRead().then(() => setUnreadNotifications(0)).catch(() => {});
  }), [on, setUnreadNotifications]);

  const more = useCallback(async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try { const r = await notificationsApi.list(cursor); setItems((p) => [...(p || []), ...r.notifications]); setCursor(r.nextCursor); } finally { setLoadingMore(false); }
  }, [cursor]);

  const remove = async (id: string) => {
    setItems((p) => p?.filter((x) => x.id !== id) || p);
    notificationsApi.remove(id).catch(() => {});
  };

  const today = (items || []).filter((n) => Date.now() - new Date(n.created_at).getTime() < 86400000);
  const earlier = (items || []).filter((n) => Date.now() - new Date(n.created_at).getTime() >= 86400000);

  const render = (n: Notification) => {
    const { text, href } = describe(n);
    const body = (
      <p className="text-sm">
        {n.actor_username && <Link href={`/profile/${n.actor_username}`} className="font-semibold hover:underline mr-1">{n.actor_username}</Link>}
        <span>{text}</span> <span className="text-zinc-500 text-xs">{timeAgo(n.created_at)}</span>
      </p>
    );
    return (
      <li key={n.id} className={`flex items-center gap-3 px-3 py-3 rounded-xl group ${n.is_read ? '' : 'bg-indigo-500/[0.06]'}`}>
        {n.actor_username ? <Link href={`/profile/${n.actor_username}`}><Avatar src={n.actor_avatar_url} name={n.actor_full_name} size={44} /></Link> : <SystemIcon type={n.type} />}
        <div className="flex-1 min-w-0">{href ? <Link href={href} className="block">{body}</Link> : body}</div>
        {n.type === 'follow' && n.actor_username && <FollowButton username={n.actor_username} initial={Boolean(n.following_actor)} size="sm" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {n.preview_url && !n.preview_url.endsWith('.mp4') && <img src={n.preview_url} alt="" className="w-11 h-11 rounded-lg object-cover" />}
        <button onClick={() => remove(n.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-500 hover:text-red-400" aria-label="Remove notification"><Trash2 size={14} /></button>
      </li>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {items && items.length > 0 && <span className="text-xs text-zinc-500 inline-flex items-center gap-1"><CheckCheck size={14} /> All caught up</span>}
      </div>
      {error ? <ErrorState message={error} onRetry={load} /> : items === null ? <Spinner /> : items.length === 0 ? (
        <EmptyState icon={<Bell size={32} />} title="No notifications yet" description="When people follow you, like or comment on your work, you'll see it here." />
      ) : (
        <>
          {today.length > 0 && <section><h2 className="text-sm font-bold mb-1 px-3">Today</h2><ul>{today.map(render)}</ul></section>}
          {earlier.length > 0 && <section><h2 className="text-sm font-bold mb-1 px-3">Earlier</h2><ul>{earlier.map(render)}</ul></section>}
          <LoadMore onVisible={more} loading={loadingMore} hasMore={Boolean(cursor)} />
        </>
      )}
    </div>
  );
}
