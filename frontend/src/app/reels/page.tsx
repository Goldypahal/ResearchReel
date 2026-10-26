"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileText, Film, Pause, Play, Plus, Share2, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { reelsApi, type Reel } from '@/lib/api';
import { useCursorList, useInfiniteSentinel } from '@/lib/useCursorList';
import { mediaUrl } from '@/lib/media';
import { displayName, formatCount, timeAgo } from '@/lib/utils';
import { EmptyState, ErrorState, LoadingBlock, Spinner } from '@/components/common/States';
import Avatar from '@/components/common/Avatar';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import FollowButton from '@/components/common/FollowButton';
import { toast } from '@/components/ui/use-toast';

function ReelCard({ reel, muted, onToggleMute, autoFocus }: { reel: Reel; muted: boolean; onToggleMute: () => void; autoFocus: boolean }) {
  const { user } = useAuth();
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const counted = useRef(false);

  useEffect(() => { if (autoFocus) wrap.current?.scrollIntoView({ block: 'start' }); }, [autoFocus]);

  // Play when mostly visible, pause otherwise; count a view after 2s of playback.
  useEffect(() => {
    const el = wrap.current;
    const v = video.current;
    if (!el || !v) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio > 0.7) v.play().catch(() => undefined);
      else v.pause();
    }, { threshold: [0, 0.7, 1] });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const onTime = () => {
    const v = video.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
    if (!counted.current && v.currentTime > 2) {
      counted.current = true;
      reelsApi.recordView(reel.id);
    }
  };

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  };

  const share = async () => {
    const url = `${window.location.origin}/reels?r=${reel.id}`;
    try {
      if (navigator.share) await navigator.share({ title: reel.title, url });
      else { await navigator.clipboard.writeText(url); toast({ title: 'Link copied', variant: 'success' }); }
    } catch { /* dismissed */ }
  };

  return (
    <div ref={wrap} className="relative h-[calc(100vh-9rem)] max-h-[780px] min-h-[480px] snap-start overflow-hidden rounded-3xl border border-[var(--border)] bg-black text-white shadow-2xl">
      {failed ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/70">
          <Film /> This reel couldn&apos;t be played.
        </div>
      ) : (
        <video
          ref={video}
          src={mediaUrl(reel.video_url)}
          poster={mediaUrl(reel.thumbnail_url)}
          className="h-full w-full object-cover"
          loop
          playsInline
          muted={muted}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={onTime}
          onError={() => setFailed(true)}
          onClick={toggle}
          aria-label={reel.title}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold backdrop-blur-md">
          {reel.duration_seconds ? `0:${String(reel.duration_seconds).padStart(2, '0')}` : 'Reel'} · {formatCount(reel.view_count)} views
        </span>
        <button onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="rounded-full bg-black/40 p-2 backdrop-blur-md">
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {!playing && !failed && (
        <button onClick={toggle} aria-label="Play" className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md">
          <Play size={28} className="ml-1" />
        </button>
      )}

      <div className="absolute inset-x-4 bottom-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <Link href={`/profile/${reel.username}`} className="flex min-w-0 items-center gap-2">
            <Avatar src={reel.avatar_url} name={displayName(reel)} size="sm" />
            <span className="truncate text-sm font-semibold">{reel.username}</span>
            <VerifiedBadge status={reel.verification_status} />
          </Link>
          {user && user.id !== reel.author_id && (
            <FollowButton username={reel.username} initialFollowing={Boolean(reel.is_following)} size="sm" className="border-white/30 text-white" />
          )}
          <span className="text-xs text-white/60">{timeAgo(reel.created_at)}</span>
        </div>
        <h2 className="text-base font-bold leading-snug">{reel.title}</h2>
        {reel.description && <p className="line-clamp-2 text-xs text-white/80">{reel.description}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {reel.linked_paper_id && (
            <Link href={`/library/documents/${reel.linked_paper_id}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs backdrop-blur-md hover:bg-white/20">
              <FileText size={12} /> <span className="truncate">{reel.paper_title || 'Source paper'}</span>
            </Link>
          )}
          <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs backdrop-blur-md hover:bg-white/20"><Share2 size={12} /> Share</button>
          <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="ml-auto rounded-full bg-white/10 p-1.5">{playing ? <Pause size={14} /> : <Play size={14} />}</button>
        </div>
        <div className="h-0.5 overflow-hidden rounded-full bg-white/20"><div className="h-full bg-white" style={{ width: `${progress * 100}%` }} /></div>
      </div>
    </div>
  );
}

function ReelsFeed() {
  const { user } = useAuth();
  const params = useSearchParams();
  const focus = params.get('r');
  const [muted, setMuted] = useState(true);
  const fetcher = useCallback((cursor: string | null) => reelsApi.getFeed(cursor), []);
  const { items, initialLoading, loading, error, hasMore, loadMore, reload } = useCursorList<Reel>(fetcher);
  const sentinel = useInfiniteSentinel(loadMore);

  return (
    <div className="mx-auto max-w-md space-y-4 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-extrabold"><Film size={22} className="text-indigo-400" /> Reels</h1>
        {user && (
          <Link href="/reels/create" className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"><Plus size={14} /> Create</Link>
        )}
      </div>
      {initialLoading ? (
        <LoadingBlock />
      ) : error && items.length === 0 ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Film size={20} />}
          title="No reels yet"
          description="Reels are 30–60 second explainers made from research papers."
          action={user ? <Link href="/reels/create" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Make the first one</Link> : undefined}
        />
      ) : (
        <div className="space-y-6">
          {items.map((r) => <ReelCard key={r.id} reel={r} muted={muted} onToggleMute={() => setMuted((m) => !m)} autoFocus={r.id === focus} />)}
          <div ref={sentinel} />
          {loading && <div className="flex justify-center py-6"><Spinner /></div>}
          {!hasMore && <p className="py-6 text-center text-xs text-muted-foreground">You&apos;ve seen every reel.</p>}
        </div>
      )}
    </div>
  );
}

export default function ReelsFeedPage() {
  return <Suspense fallback={<LoadingBlock />}><ReelsFeed /></Suspense>;
}
