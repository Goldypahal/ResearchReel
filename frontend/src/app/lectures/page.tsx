"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, CalendarClock, Plus, Radio, Search, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { lecturesApi, type Lecture, type LectureWhen } from '@/lib/api';
import { useCursorList } from '@/lib/useCursorList';
import { EmptyState, ErrorState, SkeletonRows, Spinner } from '@/components/common/States';
import Avatar from '@/components/common/Avatar';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import { cn, displayName } from '@/lib/utils';
import { formatWhen, StatusPill } from '@/components/lectures/LectureBits';

const TABS: { key: LectureWhen; label: string; auth?: boolean }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'live', label: 'Live now' },
  { key: 'past', label: 'Past' },
  { key: 'mine', label: 'My lectures', auth: true },
];

function LectureCard({ lecture }: { lecture: Lecture }) {
  const seats = lecture.capacity != null ? `${lecture.registered_count}/${lecture.capacity} registered` : `${lecture.registered_count} registered`;
  return (
    <Link
      href={`/lectures/${lecture.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <StatusPill status={lecture.status} />
        <span className="truncate rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{lecture.topic}</span>
      </div>
      <h3 className="text-lg font-bold leading-snug group-hover:text-primary">{lecture.title}</h3>
      {lecture.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{lecture.description}</p>}
      <div className="mt-4 flex items-center gap-3">
        <Avatar src={lecture.host_avatar_url} name={displayName({ full_name: lecture.host_name, username: lecture.host_username })} size="sm" />
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-sm font-semibold">
            {displayName({ full_name: lecture.host_name, username: lecture.host_username })}
            <VerifiedBadge status={lecture.host_verification_status} size={13} />
          </p>
          {lecture.host_institution && <p className="truncate text-xs text-muted-foreground">{lecture.host_institution}</p>}
        </div>
      </div>
      {lecture.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {lecture.tags.map((t) => <span key={t} className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{t}</span>)}
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-4 text-xs text-muted-foreground" style={{ marginTop: '1rem' }}>
        <span className="flex items-center gap-1"><CalendarClock size={13} /> {formatWhen(lecture.starts_at)} · {lecture.duration_minutes} min</span>
        <span className="flex items-center gap-1"><Users size={13} /> {seats}</span>
        {lecture.is_registered && <span className="font-semibold text-emerald-500">You&apos;re registered</span>}
        {lecture.is_host && <span className="font-semibold text-primary">You&apos;re hosting</span>}
      </div>
    </Link>
  );
}

export default function LecturesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<LectureWhen>('upcoming');
  const [topic, setTopic] = useState('');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [topics, setTopics] = useState<{ topic: string; count: number }[]>([]);
  const [canHost, setCanHost] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => { lecturesApi.topics().then(setTopics).catch(() => setTopics([])); }, []);
  useEffect(() => {
    if (!user) return;
    lecturesApi.canHost().then((r) => setCanHost(r.can_host)).catch(() => setCanHost(false));
  }, [user]);

  const fetcher = useCallback(
    (cursor: string | null) => lecturesApi.list({ when: tab, topic: topic || undefined, q: debounced || undefined }, cursor),
    [tab, topic, debounced]
  );
  const { items, error, hasMore, loading, initialLoading, loadMore, reload } = useCursorList(fetcher);

  const emptyCopy: Record<LectureWhen, { title: string; description: string }> = {
    upcoming: { title: 'No upcoming lectures yet', description: 'When verified scholars schedule lectures they appear here. Check back soon.' },
    live: { title: 'Nothing live right now', description: 'Lectures show up here while they are in progress.' },
    past: { title: 'No past lectures', description: 'Finished lectures, with recordings when hosts add them, appear here.' },
    mine: { title: 'No lectures yet', description: "Lectures you register for or host will appear here." },
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"><BookOpen size={22} className="text-primary" /> Lectures</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Live talks from verified scholars and faculty. Register to get the join link, add it to your calendar and send questions to the host.
          </p>
        </div>
        {canHost ? (
          <Link href="/lectures/host" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus size={16} /> Host a lecture
          </Link>
        ) : user ? (
          <Link href="/settings?tab=verification" className="text-sm text-muted-foreground hover:text-foreground">
            Verified scholars can host lectures →
          </Link>
        ) : null}
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1 no-scrollbar">
          {TABS.filter((t) => !t.auth || user).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn('flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {t.key === 'live' && <Radio size={13} className="text-red-400" />}
              {t.label}
            </button>
          ))}
        </div>
        <label className="relative block md:w-72">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lectures"
            aria-label="Search lectures"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      {topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[{ topic: '', count: 0 }, ...topics].map((t) => (
            <button
              key={t.topic || 'all'}
              onClick={() => setTopic(t.topic)}
              className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                topic === t.topic ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}
            >
              {t.topic || 'All topics'}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : initialLoading ? (
        <SkeletonRows rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={20} />}
          title={debounced || topic ? 'No lectures match your search' : emptyCopy[tab].title}
          description={debounced || topic ? 'Try a different term or topic.' : emptyCopy[tab].description}
          action={canHost && tab !== 'past' ? <Link href="/lectures/host" className="text-sm font-semibold text-primary">Host a lecture</Link> : undefined}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((l) => <LectureCard key={l.id} lecture={l} />)}
          </div>
          {hasMore && (
            <div className="flex justify-center">
              <button onClick={loadMore} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-5 text-sm font-medium hover:bg-muted disabled:opacity-50">
                {loading ? <Spinner size={16} /> : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
