"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BarChart2, Bookmark, Grid, PlaySquare, UserX } from 'lucide-react';
import ProfileHeader from '@/components/profile/ProfileHeader';
import AnalyticsDashboard from '@/components/profile/AnalyticsDashboard';
import DOIImportModal from '@/components/profile/DOIImportModal';
import PostCard from '@/components/feed/PostCard';
import { EmptyState, ErrorState, LoadingBlock, Spinner } from '@/components/common/States';
import { ApiError, errorMessage, postsApi, reelsApi, usersApi, type Post, type Profile, type Reel } from '@/lib/api';
import { useCursorList, useInfiniteSentinel } from '@/lib/useCursorList';
import { mediaUrl } from '@/lib/media';
import { cn, formatCount } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

type ProfileTab = 'posts' | 'reels' | 'saved' | 'analytics';

function PostsList({ fetcher, empty, onUnsaved }: {
  fetcher: (cursor: string | null) => Promise<{ items: Post[]; nextCursor: string | null }>;
  empty: React.ReactNode;
  onUnsaved?: boolean;
}) {
  const { items, initialLoading, loading, error, hasMore, loadMore, reload, remove, prepend } = useCursorList<Post>(fetcher);
  const sentinel = useInfiniteSentinel(loadMore);
  // Expose prepend for imports via a custom event (keeps this list self-contained).
  useEffect(() => {
    const onNew = (e: Event) => (e as CustomEvent<Post[]>).detail.forEach(prepend);
    window.addEventListener('researchreel:posts-created', onNew);
    return () => window.removeEventListener('researchreel:posts-created', onNew);
  }, [prepend]);

  if (initialLoading) return <LoadingBlock />;
  if (error && items.length === 0) return <ErrorState message={error} onRetry={reload} />;
  if (items.length === 0) return <>{empty}</>;
  return (
    <div className="pt-4">
      {items.map((p) => <PostCard key={p.id} post={p} onDeleted={remove} onUnsaved={onUnsaved ? remove : undefined} />)}
      <div ref={sentinel} />
      {loading && <div className="flex justify-center py-6"><Spinner /></div>}
      {!hasMore && items.length > 3 && <p className="py-6 text-center text-xs text-muted-foreground">That&apos;s everything.</p>}
    </div>
  );
}

function ReelsGrid({ username, isOwn }: { username: string; isOwn: boolean }) {
  const fetcher = useCallback((cursor: string | null) => reelsApi.getFeed(cursor, username), [username]);
  const { items, initialLoading, error, reload } = useCursorList<Reel>(fetcher);
  if (initialLoading) return <LoadingBlock />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (items.length === 0) {
    return (
      <EmptyState
        className="mt-6"
        icon={<PlaySquare size={20} />}
        title="No reels yet"
        description={isOwn ? 'Turn one of your papers into a 30–60 second explainer.' : undefined}
        action={isOwn ? <Link href="/reels/create" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Create a reel</Link> : undefined}
      />
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1 pt-4 md:gap-3">
      {items.map((r) => (
        <Link key={r.id} href={`/reels?r=${r.id}`} className="group relative aspect-[9/16] overflow-hidden rounded-lg bg-[var(--foreground)]/5">
          {r.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(r.thumbnail_url)} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center p-3 text-center text-xs font-semibold">{r.title}</div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[11px] text-white">
            <p className="line-clamp-2 font-semibold">{r.title}</p>
            <p className="opacity-80">{formatCount(r.view_count)} views</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setNotFound(false);
    try {
      const p = await usersApi.getProfile(username);
      setProfile(p);
      document.title = `${p.full_name || p.username} (@${p.username}) · ResearchReel`;
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) setNotFound(true);
      else setError(errorMessage(err));
    }
  }, [username]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
  useEffect(() => { load(); }, [load]);

  const postsFetcher = useCallback((cursor: string | null) => usersApi.getPosts(username, cursor), [username]);
  const savedFetcher = useCallback((cursor: string | null) => postsApi.getSaved(cursor), []);

  if (notFound) {
    return (
      <EmptyState
        className="mx-auto mt-16 max-w-md"
        icon={<UserX size={20} />}
        title="This account doesn't exist"
        description={`There's no researcher with the username @${username}.`}
        action={<Link href="/discover" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Find researchers</Link>}
      />
    );
  }
  if (error) return <ErrorState className="mx-auto mt-16 max-w-md" message={error} onRetry={load} />;
  if (!profile) return <LoadingBlock className="pt-32" />;

  const tabs: { key: ProfileTab; label: string; icon: React.ElementType; own?: boolean }[] = [
    { key: 'posts', label: 'Posts', icon: Grid },
    { key: 'reels', label: 'Reels', icon: PlaySquare },
    { key: 'saved', label: 'Saved', icon: Bookmark, own: true },
    { key: 'analytics', label: 'Analytics', icon: BarChart2, own: true },
  ];

  return (
    <div className="mx-auto max-w-[935px] pb-24">
      <ProfileHeader
        profile={profile}
        onFollowChange={(following) =>
          setProfile((p) => (p ? { ...p, is_following: following, follower_count: p.follower_count + (following ? 1 : -1) } : p))
        }
        onImportPapers={profile.is_self ? () => setImportOpen(true) : undefined}
        onProfileChange={(patch) =>
          setProfile((p) => {
            if (!p) return p;
            // Blocking also ends the follow, so the follower count drops by one.
            const droppedFollow = patch.is_blocked && p.is_following;
            return { ...p, ...patch, follower_count: p.follower_count - (droppedFollow ? 1 : 0) };
          })
        }
      />

      <div role="tablist" className="flex items-center justify-center gap-8 md:gap-12">
        {tabs.filter((t) => !t.own || profile.is_self).map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              '-mt-px flex items-center gap-1.5 border-t py-4 text-xs font-semibold uppercase tracking-wider',
              tab === t.key ? 'border-[var(--foreground)]' : 'border-transparent text-muted-foreground hover:text-[var(--foreground)]'
            )}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      <section>
        {profile.is_blocked ? (
          <EmptyState
            className="mt-6"
            icon={<UserX size={20} />}
            title={`You blocked @${profile.username}`}
            description="You won't see their posts or reels, and they can't find your profile or message you. Unblock them from the ⋯ menu."
          />
        ) : tab === 'posts' && (
          <PostsList
            fetcher={postsFetcher}
            empty={
              <EmptyState
                className="mt-6"
                icon={<Grid size={20} />}
                title="No posts yet"
                description={profile.is_self ? 'Share a finding, a question, or one of your papers.' : `@${profile.username} hasn't posted yet.`}
                action={profile.is_self ? <Link href="/create" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Create a post</Link> : undefined}
              />
            }
          />
        )}
        {!profile.is_blocked && tab === 'reels' && <ReelsGrid username={profile.username} isOwn={profile.is_self} />}
        {tab === 'saved' && profile.is_self && (
          <PostsList
            fetcher={savedFetcher}
            onUnsaved
            empty={<EmptyState className="mt-6" icon={<Bookmark size={20} />} title="Nothing saved yet" description="Tap the bookmark on any post to keep it here." />}
          />
        )}
        {tab === 'analytics' && profile.is_self && <div className="pt-6"><AnalyticsDashboard /></div>}
      </section>

      {profile.is_self && (
        <DOIImportModal
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          onImport={(posts) => {
            setTab('posts');
            setProfile((p) => (p ? { ...p, post_count: p.post_count + posts.length } : p));
            window.setTimeout(() => window.dispatchEvent(new CustomEvent('researchreel:posts-created', { detail: posts })), 0);
            toast({ title: `Added ${posts.length} publication${posts.length === 1 ? '' : 's'} to your profile`, variant: 'success' });
          }}
        />
      )}
    </div>
  );
}
