"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Bookmark, Share2, Volume2, VolumeX, FileText, Play, Flag, Trash2, ExternalLink, MonitorPlay } from 'lucide-react';
import { Avatar, VerifiedBadge, Modal } from '@/components/common';
import FollowButton from '@/components/common/FollowButton';
import Comments from '@/components/feed/Comments';
import ReportDialog from '@/components/feed/ReportDialog';
import { reelsApi, errorMessage, type Reel } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { compactNumber } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';
import { loadYouTubeApi, previewWindow, formatDuration, PREVIEW_SECONDS, YT_STATE, type YTPlayer } from '@/lib/youtube';

/**
 * A Research Pick in the Reels feed: plays a PREVIEW_SECONDS preview of the YouTube video on loop
 * (tap to pause), with a button to open the full video on /watch/[id] at the same moment.
 * The player only exists while the reel is on screen, so scrolling away stops it.
 */
function EmbeddedVideo({ reel, active, muted }: { reel: Reel; active: boolean; muted: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const windowRef = useRef<{ start: number; end: number } | null>(null);
  const mutedRef = useRef(muted);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [duration, setDuration] = useState(0);
  const [win, setWin] = useState<{ start: number; end: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    if (!active || !reel.external_id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const host = hostRef.current;
    const fixWindow = (p: YTPlayer) => {
      if (windowRef.current) return;
      const d = p.getDuration();
      if (!d) return;
      windowRef.current = previewWindow(d);
      setWin(windowRef.current);
      setDuration(d);
      if (windowRef.current.start) p.seekTo(windowRef.current.start, true);
    };
    loadYouTubeApi().then((YT) => {
      if (cancelled || !host) return;
      const el = document.createElement('div');
      host.appendChild(el);
      playerRef.current = new YT.Player(el, {
        host: 'https://www.youtube-nocookie.com',
        videoId: reel.external_id!,
        width: '100%', height: '100%',
        // No YouTube controls in the feed: a reel is tap-to-pause; the full player has controls.
        playerVars: { autoplay: 1, mute: 1, controls: 0, playsinline: 1, rel: 0, modestbranding: 1, disablekb: 1, fs: 0, iv_load_policy: 3, origin: window.location.origin },
        events: {
          onReady: (e) => { fixWindow(e.target); if (!mutedRef.current) e.target.unMute(); e.target.playVideo(); setReady(true); },
          onStateChange: (e) => {
            setPaused(e.data === YT_STATE.PAUSED);
            if (e.data === YT_STATE.PLAYING) fixWindow(e.target);
            if (e.data === YT_STATE.ENDED) { e.target.seekTo(windowRef.current?.start || 0, true); e.target.playVideo(); }
          },
          onError: () => setFailed(true),
        },
      });
      timer = setInterval(() => {
        const p = playerRef.current; const w = windowRef.current;
        if (!p || !w || typeof p.getCurrentTime !== 'function') return;
        const t = p.getCurrentTime();
        if (t >= w.end - 0.3 || t < w.start - 1) p.seekTo(w.start, true); // loop the preview
        setPosition(t);
        setProgress(Math.max(0, Math.min(1, (t - w.start) / (w.end - w.start))));
      }, 250);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      try { playerRef.current?.destroy(); } catch { /* already gone */ }
      playerRef.current = null; windowRef.current = null;
      if (host) host.innerHTML = '';
      setReady(false); setPaused(false); setProgress(0);
    };
  }, [active, reel.external_id]);

  useEffect(() => {
    mutedRef.current = muted;
    const p = playerRef.current;
    if (ready && p) { if (muted) p.mute(); else p.unMute(); }
  }, [muted, ready]);

  const togglePause = () => {
    const p = playerRef.current;
    if (!p) return;
    if (paused) p.playVideo(); else p.pauseVideo();
  };

  const isPreview = duration > PREVIEW_SECONDS + 15;
  const fullHref = `/watch/${reel.id}${position > 5 ? `?t=${Math.floor(position)}` : ''}`;

  return (
    <div className="absolute inset-x-0 top-14">
      <div className="relative aspect-video bg-black">
        <div ref={hostRef} className="absolute inset-0 [&>iframe]:w-full [&>iframe]:h-full" />
        {(!active || !ready) && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {reel.thumbnail_url && <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />}
            {failed && <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white/80">This video can&apos;t play here. <a href={reel.source_url || '#'} target="_blank" rel="noopener noreferrer" className="underline">Open it on YouTube</a></p>}
          </div>
        )}
        {/* Captures taps so the feed behaves like a reel (and YouTube's own UI stays out of the way). */}
        {active && ready && <button onClick={togglePause} className="absolute inset-0" aria-label={paused ? 'Play preview' : 'Pause preview'} />}
        {(!active || paused) && (
          <span className="pointer-events-none absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/50 flex items-center justify-center"><Play size={30} className="text-white fill-white ml-1" /></span>
        )}
        {active && ready && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/20"><div className="h-full bg-white" style={{ width: `${progress * 100}%` }} /></div>}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-4 pr-16 pt-3 text-white">
        <Link href={fullHref} className="inline-flex items-center gap-1.5 shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-white text-black hover:bg-white/90">
          <MonitorPlay size={14} /> Watch full video{duration ? ` · ${formatDuration(duration)}` : ''}
        </Link>
        {isPreview && win && <span className="text-[11px] text-white/70">{PREVIEW_SECONDS}-sec preview from {formatDuration(win.start)}</span>}
      </div>
    </div>
  );
}

export default function ReelPlayer({ reel: initial, active, muted, onToggleMute, onDeleted }: {
  reel: Reel; active: boolean; muted: boolean; onToggleMute: () => void; onDeleted?: (id: string) => void;
}) {
  const { user } = useAuth();
  const [reel, setReel] = useState(initial);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const viewed = useRef(false);

  const embedded = initial.source_type === 'youtube_embed';

  useEffect(() => {
    if (embedded && active && !viewed.current) { viewed.current = true; reelsApi.view(reel.id); }
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      if (!viewed.current) { viewed.current = true; reelsApi.view(reel.id); }
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [active, reel.id, embedded]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => {}); else { v.pause(); setPlaying(false); }
  };

  const toggleLike = async () => {
    const liked = !reel.is_liked;
    setReel((r) => ({ ...r, is_liked: liked, like_count: r.like_count + (liked ? 1 : -1) }));
    try {
      const res = liked ? await reelsApi.like(reel.id) : await reelsApi.unlike(reel.id);
      setReel((r) => ({ ...r, is_liked: res.is_liked, like_count: res.like_count }));
    } catch (err) {
      setReel((r) => ({ ...r, is_liked: !liked, like_count: r.like_count + (liked ? -1 : 1) }));
      toast({ title: 'Could not update like', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const toggleSave = async () => {
    const saved = !reel.is_saved;
    setReel((r) => ({ ...r, is_saved: saved }));
    try { if (saved) await reelsApi.save(reel.id); else await reelsApi.unsave(reel.id); }
    catch (err) { setReel((r) => ({ ...r, is_saved: !saved })); toast({ title: 'Could not update saved reels', description: errorMessage(err), variant: 'destructive' }); }
  };

  const share = async () => {
    const url = `${window.location.origin}/reels?id=${reel.id}`;
    try {
      if (navigator.share) await navigator.share({ title: reel.title, url });
      else { await navigator.clipboard.writeText(url); toast({ title: 'Link copied', variant: 'success', duration: 1500 }); }
    } catch { /* cancelled */ }
  };

  const remove = async () => {
    try { await reelsApi.remove(reel.id); toast({ title: 'Reel deleted', variant: 'success' }); onDeleted?.(reel.id); }
    catch (err) { toast({ title: 'Could not delete reel', description: errorMessage(err), variant: 'destructive' }); }
  };

  const isOwner = user?.id === reel.author_id;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden md:rounded-3xl select-none">
      {embedded ? <EmbeddedVideo reel={reel} active={active} muted={muted} /> : <video
        ref={videoRef}
        src={reel.video_url}
        poster={reel.thumbnail_url || undefined}
        className="w-full h-full object-contain"
        loop
        muted={muted}
        playsInline
        preload={active ? 'auto' : 'metadata'}
        onClick={togglePlay}
        onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
        aria-label={reel.title}
      />}
      {!embedded && !playing && (
        <button onClick={togglePlay} className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/40 flex items-center justify-center" aria-label="Play">
          <Play size={30} className="text-white fill-white ml-1" />
        </button>
      )}

      <button onClick={onToggleMute} className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white" aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 text-white">
        <button onClick={toggleLike} className="flex flex-col items-center gap-1" aria-pressed={reel.is_liked} aria-label="Like">
          <Heart size={28} className={reel.is_liked ? 'fill-red-500 text-red-500' : ''} />
          <span className="text-xs font-semibold">{compactNumber(reel.like_count)}</span>
        </button>
        <button onClick={() => setCommentsOpen(true)} className="flex flex-col items-center gap-1" aria-label="Comments">
          <MessageCircle size={28} />
          <span className="text-xs font-semibold">{compactNumber(reel.comment_count)}</span>
        </button>
        <button onClick={toggleSave} aria-pressed={reel.is_saved} aria-label="Save"><Bookmark size={28} className={reel.is_saved ? 'fill-white' : ''} /></button>
        <button onClick={share} aria-label="Share"><Share2 size={26} /></button>
        {isOwner ? (
          <button onClick={remove} aria-label="Delete reel"><Trash2 size={24} /></button>
        ) : (
          <button onClick={() => setReportOpen(true)} aria-label="Report reel"><Flag size={24} /></button>
        )}
      </div>

      <div className="absolute left-0 right-16 bottom-0 p-4 pb-6 text-white bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <Link href={`/profile/${reel.username}`} className="flex items-center gap-2 min-w-0">
            <Avatar src={reel.avatar_url} name={reel.full_name} size={32} />
            <span className="font-semibold text-sm truncate">{reel.username}</span>
            <VerifiedBadge status={reel.verification_status} />
          </Link>
          {!isOwner && <FollowButton username={reel.username} initial={reel.is_following_author} size="sm" />}
        </div>
        <p className="font-semibold text-sm">{reel.title}</p>
        {reel.description && (
          <button onClick={() => setExpanded((e) => !e)} className={`text-left text-xs text-white/80 mt-1 ${expanded ? '' : 'line-clamp-2'}`}>{reel.description}</button>
        )}
        {embedded && reel.source_url && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/80">
            <a href={reel.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25">
              <ExternalLink size={11} /> {reel.source_channel || 'YouTube'} on YouTube
            </a>
            {reel.source_dataset === 'hackertube' && (
              <a href="https://hackertube.org" target="_blank" rel="noopener noreferrer" className="underline decoration-white/40 hover:text-white">picked via HackerTube</a>
            )}
          </div>
        )}
        {reel.linked_paper_id && (
          <Link href={`/library/documents/${reel.linked_paper_id}`} className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 max-w-full">
            <FileText size={12} className="shrink-0" /><span className="truncate">{reel.paper_title || 'Read the paper'}</span>
          </Link>
        )}
      </div>
      {!embedded && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20"><div className="h-full bg-white" style={{ width: `${progress * 100}%` }} /></div>}

      <Modal open={commentsOpen} onClose={() => setCommentsOpen(false)} title="Comments">
        <div className="p-4"><Comments kind="reel" id={reel.id} ownerId={reel.author_id} onCountChange={(d) => setReel((r) => ({ ...r, comment_count: r.comment_count + d }))} /></div>
      </Modal>
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} videoId={reel.id} />
    </div>
  );
}
