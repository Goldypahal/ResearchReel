"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Heart, Bookmark, Share2, ExternalLink } from 'lucide-react';
import { reelsApi, errorMessage, type Reel } from '@/lib/api';
import { Spinner, ErrorState, Avatar, VerifiedBadge } from '@/components/common';
import FollowButton from '@/components/common/FollowButton';
import Comments from '@/components/feed/Comments';
import { useAuth } from '@/context/AuthContext';
import { compactNumber } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

/**
 * The full video for a reel. Research Picks play the whole YouTube video here, with its normal
 * controls, starting where the Reels preview was (?t=seconds). Uploaded reels play their own file.
 */
function Watch() {
  const { id } = useParams<{ id: string }>();
  const start = Math.max(0, Number.parseInt(useSearchParams().get('t') || '0', 10) || 0);
  const { user } = useAuth();
  const [reel, setReel] = useState<Reel | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { reelsApi.get(id).then(setReel).catch((e) => setError(errorMessage(e))); }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!reel) return <Spinner label="Loading video" />;

  const embedded = reel.source_type === 'youtube_embed' && reel.external_id;
  const src = embedded
    ? `https://www.youtube-nocookie.com/embed/${reel.external_id}?autoplay=1&rel=0&modestbranding=1&playsinline=1${start ? `&start=${start}` : ''}`
    : null;

  const toggleLike = async () => {
    const liked = !reel.is_liked;
    setReel({ ...reel, is_liked: liked, like_count: reel.like_count + (liked ? 1 : -1) });
    try {
      const r = liked ? await reelsApi.like(reel.id) : await reelsApi.unlike(reel.id);
      setReel((x) => (x ? { ...x, is_liked: r.is_liked, like_count: r.like_count } : x));
    } catch (err) {
      setReel((x) => (x ? { ...x, is_liked: !liked, like_count: x.like_count + (liked ? -1 : 1) } : x));
      toast({ title: 'Could not update like', description: errorMessage(err), variant: 'destructive' });
    }
  };
  const toggleSave = async () => {
    const saved = !reel.is_saved;
    setReel({ ...reel, is_saved: saved });
    try { if (saved) await reelsApi.save(reel.id); else await reelsApi.unsave(reel.id); }
    catch (err) { setReel((x) => (x ? { ...x, is_saved: !saved } : x)); toast({ title: 'Could not update saved', description: errorMessage(err), variant: 'destructive' }); }
  };
  const share = async () => {
    const url = `${window.location.origin}/watch/${reel.id}`;
    try {
      if (navigator.share) await navigator.share({ title: reel.title, url });
      else { await navigator.clipboard.writeText(url); toast({ title: 'Link copied', variant: 'success', duration: 1500 }); }
    } catch { /* cancelled */ }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link href={`/reels?id=${reel.id}${embedded ? '&tab=picks' : ''}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-[var(--foreground)]">
        <ArrowLeft size={16} /> Back to reels
      </Link>

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
        {src ? (
          <iframe src={src} title={reel.title} className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          <video src={reel.video_url} poster={reel.thumbnail_url || undefined} controls autoPlay playsInline className="absolute inset-0 w-full h-full" />
        )}
      </div>

      <div className="space-y-3">
        <h1 className="text-xl font-bold leading-snug">{reel.title}</h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link href={`/profile/${reel.username}`} className="flex items-center gap-2 min-w-0">
              <Avatar src={reel.avatar_url} name={reel.full_name} size={36} />
              <span className="font-semibold text-sm truncate">{reel.full_name || reel.username}</span>
              <VerifiedBadge status={reel.verification_status} />
            </Link>
            {user && user.id !== reel.author_id && <FollowButton username={reel.username} initial={reel.is_following_author} size="sm" />}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleLike} aria-pressed={reel.is_liked} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-[var(--foreground)]/10 hover:bg-[var(--foreground)]/15">
              <Heart size={16} className={reel.is_liked ? 'fill-red-500 text-red-500' : ''} /> {compactNumber(reel.like_count)}
            </button>
            <button onClick={toggleSave} aria-pressed={reel.is_saved} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-[var(--foreground)]/10 hover:bg-[var(--foreground)]/15">
              <Bookmark size={16} className={reel.is_saved ? 'fill-current' : ''} /> {reel.is_saved ? 'Saved' : 'Save'}
            </button>
            <button onClick={share} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-[var(--foreground)]/10 hover:bg-[var(--foreground)]/15"><Share2 size={16} /> Share</button>
          </div>
        </div>

        {embedded && reel.source_url && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
            <a href={reel.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-400"><ExternalLink size={12} /> {reel.source_channel || 'YouTube'} on YouTube</a>
            {reel.source_dataset === 'hackertube' && <a href="https://hackertube.org" target="_blank" rel="noopener noreferrer" className="underline">picked via HackerTube</a>}
            <span>The video belongs to its channel.</span>
          </p>
        )}

        {reel.description && (
          <div className="rounded-xl bg-[var(--foreground)]/5 p-4">
            <p className={`text-sm whitespace-pre-line leading-relaxed ${expanded ? '' : 'line-clamp-4'}`}>{reel.description}</p>
            {reel.description.length > 280 && <button onClick={() => setExpanded((e) => !e)} className="mt-2 text-xs font-semibold text-indigo-400">{expanded ? 'Show less' : 'Show more'}</button>}
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Comments · {compactNumber(reel.comment_count)}</h2>
        <Comments kind="reel" id={reel.id} ownerId={reel.author_id} onCountChange={(d) => setReel((x) => (x ? { ...x, comment_count: x.comment_count + d } : x))} />
      </section>
    </div>
  );
}

export default function WatchPage() {
  return <Suspense fallback={<Spinner />}><Watch /></Suspense>;
}
