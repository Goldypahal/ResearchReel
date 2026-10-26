"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Compass, PenSquare, Sparkles, Upload, UserPlus } from 'lucide-react';
import PostCard from './PostCard';
import StoriesBar from '@/components/social/Stories';
import { useAuth } from '@/context/AuthContext';
import { postsApi, usersApi, documentsApi, type Post } from '@/lib/api';
import { useCursorList, useInfiniteSentinel } from '@/lib/useCursorList';
import { EmptyState, ErrorState, Spinner } from '@/components/common/States';
import { cn } from '@/lib/utils';

type Scope = 'all' | 'following';

function FeedSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="animate-pulse space-y-4 rounded-2xl border border-[var(--border)] p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--foreground)]/10" />
            <div className="space-y-2">
              <div className="h-3 w-32 rounded bg-[var(--foreground)]/10" />
              <div className="h-2.5 w-20 rounded bg-[var(--foreground)]/5" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-[var(--foreground)]/10" />
          <div className="h-3 w-4/5 rounded bg-[var(--foreground)]/5" />
          <div className="h-40 w-full rounded-xl bg-[var(--foreground)]/5" />
        </div>
      ))}
    </div>
  );
}

interface Progress { posted: boolean; follows: boolean; uploaded: boolean }
const DISMISS_KEY = 'onboarding_dismissed';

/** Getting-started checklist, computed from the account's real activity. */
function Onboarding() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
    try { setDismissed(localStorage.getItem(DISMISS_KEY) === 'true'); } catch { setDismissed(false); }
  }, []);

  useEffect(() => {
    if (!user || dismissed) return;
    let cancelled = false;
    Promise.allSettled([usersApi.getProfile(user.username), documentsApi.getUserAssets()]).then(([p, d]) => {
      if (cancelled) return;
      const profile = p.status === 'fulfilled' ? p.value : null;
      setProgress({
        posted: (profile?.post_count ?? 0) > 0,
        follows: (profile?.following_count ?? 0) > 0,
        uploaded: d.status === 'fulfilled' && d.value.length > 0,
      });
    });
    return () => { cancelled = true; };
  }, [user, dismissed]);

  if (!user || dismissed || !progress) return null;
  const steps = [
    { done: progress.uploaded, title: 'Upload a paper to your library', hint: 'PDF or DOCX — we extract the abstract and DOI', href: '/library', cta: 'Upload', icon: Upload },
    { done: progress.posted, title: 'Share your first post', hint: 'A finding, a question, or a paper', href: '/create', cta: 'Post', icon: PenSquare },
    { done: progress.follows, title: 'Follow researchers in your field', hint: 'Your Following feed fills up from here', href: '/discover', cta: 'Discover', icon: UserPlus },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, 'true'); } catch { /* storage unavailable */ }
    setDismissed(true);
  };

  return (
    <section className="rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.04] p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold"><Sparkles size={15} className="text-indigo-400" /> Get started</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{doneCount} of {steps.length} done</p>
        </div>
        <button onClick={dismiss} className="text-xs font-medium text-muted-foreground hover:text-[var(--foreground)]">Dismiss</button>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ul className="space-y-2">
        {steps.map((s) => (
          <li key={s.title} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/60 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              {s.done ? <CheckCircle2 size={18} className="shrink-0 text-emerald-500" /> : <Circle size={18} className="shrink-0 text-muted-foreground" />}
              <div className="min-w-0">
                <p className={cn('truncate text-sm font-semibold', s.done && 'text-muted-foreground line-through')}>{s.title}</p>
                <p className="truncate text-xs text-muted-foreground">{s.hint}</p>
              </div>
            </div>
            {!s.done && (
              <Link href={s.href} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
                <s.icon size={13} /> {s.cta}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Feed({ tag }: { tag?: string }) {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>('all');

  const fetcher = useCallback(
    (cursor: string | null) => postsApi.getFeed({ cursor, scope: user ? scope : 'all', tag }),
    [scope, tag, user]
  );
  const { items: posts, initialLoading, loading, error, hasMore, loadMore, reload, remove } = useCursorList<Post>(fetcher);
  const sentinel = useInfiniteSentinel(loadMore);

  return (
    <div className="w-full space-y-5">
      {user && !tag && <StoriesBar />}
      {user && !tag && <Onboarding />}

      {user && (
        <div role="tablist" aria-label="Feed" className="flex gap-1 rounded-xl border border-[var(--border)] p-1">
          {(['all', 'following'] as Scope[]).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={scope === s}
              onClick={() => setScope(s)}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-semibold transition-colors',
                scope === s ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-[var(--foreground)]'
              )}
            >
              {s === 'all' ? 'For you' : 'Following'}
            </button>
          ))}
        </div>
      )}

      {initialLoading ? (
        <FeedSkeleton />
      ) : error && posts.length === 0 ? (
        <ErrorState message={error} onRetry={reload} />
      ) : posts.length === 0 ? (
        scope === 'following' ? (
          <EmptyState
            icon={<UserPlus size={20} />}
            title="Nothing from people you follow yet"
            description="Follow researchers in your field and their posts will show up here."
            action={<Link href="/discover" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Find people to follow</Link>}
          />
        ) : (
          <EmptyState
            icon={<Compass size={20} />}
            title={tag ? `No posts tagged #${tag} yet` : 'No posts yet'}
            description="Be the first to share a finding, a question or a paper with the community."
            action={<Link href="/create" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Create a post</Link>}
          />
        )
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={remove} />
          ))}
          <div ref={sentinel} />
          {loading && <div className="flex justify-center py-6"><Spinner /></div>}
          {error && <ErrorState message={error} onRetry={loadMore} />}
          {!hasMore && !loading && (
            <p className="py-6 text-center text-xs text-muted-foreground">You&apos;re all caught up.</p>
          )}
        </>
      )}
    </div>
  );
}
