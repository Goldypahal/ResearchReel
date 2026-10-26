"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, BookOpen, CheckCheck, FolderKanban, Heart, MessageSquare, UserPlus } from 'lucide-react';
import { useSocial } from '@/context/SocialContext';
import { errorMessage, notificationsApi, REACTIONS, type Notification } from '@/lib/api';
import { cn, displayName, timeAgo } from '@/lib/utils';
import { EmptyState, ErrorState, SkeletonRows, Spinner } from '@/components/common/States';
import Avatar from '@/components/common/Avatar';
import FollowButton from '@/components/common/FollowButton';

const ICON: Record<string, React.ElementType> = {
  follow: UserPlus, reaction: Heart, comment: MessageSquare, project_invite: FolderKanban,
  lecture_registration: BookOpen, lecture_question: BookOpen, lecture_cancelled: BookOpen,
};

function describe(n: Notification): { text: React.ReactNode; href: string } {
  const actorHref = n.actor_username ? `/profile/${n.actor_username}` : '#';
  const postHref = n.entity_type === 'post' && n.entity_id ? `/post/${n.entity_id}` : actorHref;
  const lectureHref = n.entity_id ? `/lectures/${n.entity_id}` : '/lectures';
  switch (n.type) {
    case 'follow':
      return { text: 'started following you.', href: actorHref };
    case 'reaction': {
      const r = REACTIONS.find((x) => x.type === n.message);
      return { text: <>reacted {r ? <>{r.emoji} <span className="font-medium">{r.label}</span></> : ''} to your post.</>, href: postHref };
    }
    case 'project_invite':
      return { text: 'added you to a project.', href: n.entity_id ? `/projects/${n.entity_id}` : '/projects' };
    case 'comment':
      return { text: <>commented: <span className="opacity-80">“{n.message}”</span></>, href: postHref };
    case 'lecture_registration':
      return { text: <>registered for your lecture <span className="font-medium">{n.message}</span>.</>, href: lectureHref };
    case 'lecture_question':
      return { text: <>asked in your lecture: <span className="opacity-80">“{n.message}”</span></>, href: lectureHref };
    case 'lecture_cancelled':
      return { text: <>cancelled the lecture <span className="font-medium">{n.message}</span>.</>, href: lectureHref };
    default:
      return { text: n.message || 'sent you a notification.', href: postHref };
  }
}

export default function NotificationsPage() {
  const { setUnreadNotifications } = useSocial();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const page = await notificationsApi.list();
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Seeing the page marks everything read (the list keeps its "new" styling until you leave).
  useEffect(() => {
    if (!items?.some((n) => !n.is_read)) return;
    notificationsApi.markAllRead().then(() => setUnreadNotifications(0)).catch(() => undefined);
  }, [items, setUnreadNotifications]);

  const more = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await notificationsApi.list(cursor);
      setItems((prev) => [...(prev || []), ...page.items]);
      setCursor(page.nextCursor);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const unread = (items || []).filter((n) => !n.is_read);
  const earlier = (items || []).filter((n) => n.is_read);

  const Row = ({ n }: { n: Notification }) => {
    const { text, href } = describe(n);
    const Icon = ICON[n.type] || Bell;
    return (
      <li className={cn('flex items-center gap-3 rounded-xl px-2 py-3', !n.is_read && 'bg-indigo-500/[0.05]')}>
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="relative shrink-0">
            <Avatar src={n.actor_avatar_url} name={displayName({ full_name: n.actor_full_name, username: n.actor_username })} />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--background)] bg-indigo-600 text-white"><Icon size={10} /></span>
          </span>
          <p className="min-w-0 text-sm">
            <span className="mr-1 font-semibold">{n.actor_username || 'Someone'}</span>
            {text}
            <span className="ml-1.5 text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
          </p>
        </Link>
        {n.type === 'follow' && n.actor_username && !n.actor_is_followed && (
          <FollowButton username={n.actor_username} initialFollowing={false} size="sm" />
        )}
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-[600px] space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unread.length > 0 && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CheckCheck size={14} /> Marked as read</span>}
      </div>

      {error && !items ? (
        <ErrorState message={error} onRetry={load} />
      ) : !items ? (
        <SkeletonRows rows={6} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Bell size={20} />} title="No notifications yet" description="When people follow you, react to or comment on your posts, you'll see it here." />
      ) : (
        <>
          {unread.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">New</h2>
              <ul>{unread.map((n) => <Row key={n.id} n={n} />)}</ul>
            </section>
          )}
          {earlier.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Earlier</h2>
              <ul>{earlier.map((n) => <Row key={n.id} n={n} />)}</ul>
            </section>
          )}
          {cursor && (
            <div className="text-center">
              <button onClick={more} disabled={loadingMore} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-semibold">
                {loadingMore && <Spinner size={14} />} Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
