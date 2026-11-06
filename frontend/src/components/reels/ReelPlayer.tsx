"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Bookmark, Share2, Volume2, VolumeX, FileText, Play, Flag, Trash2 } from 'lucide-react';
import { Avatar, VerifiedBadge, Modal } from '@/components/common';
import FollowButton from '@/components/common/FollowButton';
import Comments from '@/components/feed/Comments';
import ReportDialog from '@/components/feed/ReportDialog';
import { reelsApi, errorMessage, type Reel } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { compactNumber } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

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

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      if (!viewed.current) { viewed.current = true; reelsApi.view(reel.id); }
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [active, reel.id]);

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
      <video
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
      />
      {!playing && (
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
        {reel.linked_paper_id && (
          <Link href={`/library/documents/${reel.linked_paper_id}`} className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 max-w-full">
            <FileText size={12} className="shrink-0" /><span className="truncate">{reel.paper_title || 'Read the paper'}</span>
          </Link>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20"><div className="h-full bg-white" style={{ width: `${progress * 100}%` }} /></div>

      <Modal open={commentsOpen} onClose={() => setCommentsOpen(false)} title="Comments">
        <div className="p-4"><Comments kind="reel" id={reel.id} ownerId={reel.author_id} onCountChange={(d) => setReel((r) => ({ ...r, comment_count: r.comment_count + d }))} /></div>
      </Modal>
      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} videoId={reel.id} />
    </div>
  );
}
