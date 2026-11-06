"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, FileText, Trash2, Flag, Bot, ExternalLink } from 'lucide-react';
import { Avatar, UserLink, Modal } from '@/components/common';
import { postsApi, errorMessage, type Post } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { timeAgo, compactNumber } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';
import RichText from './RichText';
import Comments from './Comments';
import ReportDialog from './ReportDialog';

export default function PostCard({ post: initial, onDeleted }: { post: Post; onDeleted?: (id: string) => void }) {
  const { user } = useAuth();
  const [post, setPost] = useState(initial);
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const viewed = useRef(false);
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((e) => {
      if (e[0].isIntersecting && !viewed.current) { viewed.current = true; postsApi.view(post.id); }
    }, { threshold: 0.6 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [post.id]);

  const isOwner = user?.id === post.author_id;
  const isStaff = user?.role === 'admin' || user?.role === 'moderator';

  const toggleLike = async () => {
    const liked = !post.is_liked;
    setPost((p) => ({ ...p, is_liked: liked, like_count: p.like_count + (liked ? 1 : -1) }));
    try {
      const r = liked ? await postsApi.like(post.id) : await postsApi.unlike(post.id);
      setPost((p) => ({ ...p, is_liked: r.is_liked, like_count: r.like_count }));
    } catch (err) {
      setPost((p) => ({ ...p, is_liked: !liked, like_count: p.like_count + (liked ? -1 : 1) }));
      toast({ title: 'Could not update like', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const toggleBookmark = async () => {
    const saved = !post.is_bookmarked;
    setPost((p) => ({ ...p, is_bookmarked: saved }));
    try {
      if (saved) await postsApi.bookmark(post.id); else await postsApi.unbookmark(post.id);
      toast({ title: saved ? 'Saved' : 'Removed from saved', variant: 'success', duration: 1500 });
    } catch (err) {
      setPost((p) => ({ ...p, is_bookmarked: !saved }));
      toast({ title: 'Could not update saved posts', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `Post by ${post.full_name}`, url });
      else { await navigator.clipboard.writeText(url); toast({ title: 'Link copied', variant: 'success', duration: 1500 }); }
    } catch { /* user cancelled */ }
  };

  const remove = async () => {
    try {
      await postsApi.remove(post.id);
      toast({ title: 'Post deleted', variant: 'success' });
      onDeleted?.(post.id);
    } catch (err) {
      toast({ title: 'Could not delete post', description: errorMessage(err), variant: 'destructive' });
    } finally { setConfirmDelete(false); }
  };

  const caption = post.caption || '';
  const long = caption.length > 400;
  const images = post.content_type === 'image' ? post.media_urls : [];
  const video = post.content_type === 'video' ? post.media_urls[0] : null;

  return (
    <article ref={cardRef} className="border border-[var(--border)] rounded-2xl bg-[var(--foreground)]/[0.02] overflow-hidden">
      <header className="flex items-center gap-3 px-4 pt-4">
        <Link href={`/profile/${post.username}`}><Avatar src={post.avatar_url} name={post.full_name} size={38} /></Link>
        <div className="flex-1 min-w-0">
          <UserLink username={post.username} fullName={post.full_name} status={post.verification_status} className="text-sm" />
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <span>@{post.username}</span>·
            <Link href={`/post/${post.id}`} className="hover:underline"><time dateTime={post.created_at}>{timeAgo(post.created_at)}</time></Link>
            {post.publication_status && <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] uppercase">{post.publication_status}</span>}
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} className="p-1.5 rounded-full hover:bg-[var(--foreground)]/5 text-zinc-500" aria-label="Post options" aria-expanded={menuOpen}>
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-xl py-1 text-sm" onMouseLeave={() => setMenuOpen(false)}>
              {(isOwner || isStaff) && (
                <button onClick={() => { setMenuOpen(false); setConfirmDelete(true); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--foreground)]/5 text-red-400"><Trash2 size={14} /> Delete</button>
              )}
              {!isOwner && (
                <button onClick={() => { setMenuOpen(false); setReportOpen(true); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--foreground)]/5"><Flag size={14} /> Report</button>
              )}
              <button onClick={() => { setMenuOpen(false); share(); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--foreground)]/5"><Share2 size={14} /> Share</button>
            </div>
          )}
        </div>
      </header>

      {caption && (
        <div className="px-4 pt-3 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          <RichText text={long && !expanded ? `${caption.slice(0, 400)}…` : caption} />
          {long && <button onClick={() => setExpanded((e) => !e)} className="ml-1 text-sm text-zinc-500 hover:text-zinc-300">{expanded ? 'Show less' : 'Show more'}</button>}
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-3 relative bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[imageIndex]} alt={`Image ${imageIndex + 1} of ${images.length} in post by ${post.full_name}`} className="w-full max-h-[600px] object-contain" loading="lazy" />
          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <button key={i} onClick={() => setImageIndex(i)} aria-label={`Show image ${i + 1}`} className={`w-2 h-2 rounded-full ${i === imageIndex ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>
      )}

      {video && (
        <div className="mt-3 bg-black flex justify-center">
          <video src={video} controls preload="metadata" playsInline className="max-h-[600px] w-auto" />
        </div>
      )}

      {post.document_id && (
        <div className="mx-4 mt-3 rounded-xl border border-[var(--border)] p-3.5 flex gap-3 items-start bg-indigo-500/[0.04]">
          <div className="w-10 h-12 rounded-md bg-red-500/10 text-red-300 flex items-center justify-center shrink-0"><FileText size={20} /></div>
          <div className="flex-1 min-w-0">
            <Link href={`/library/documents/${post.document_id}`} className="font-semibold text-sm hover:underline line-clamp-2">{post.document_title || 'Research paper'}</Link>
            {post.document_abstract && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{post.document_abstract}</p>}
            <div className="flex gap-3 mt-2 text-xs">
              {post.document_url && <a href={post.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-400 hover:underline"><ExternalLink size={12} /> Open PDF</a>}
              <Link href={`/ai/ask?doc=${post.document_id}`} className="inline-flex items-center gap-1 text-indigo-400 hover:underline"><Bot size={12} /> Ask AI</Link>
              {post.document_pages ? <span className="text-zinc-500">{post.document_pages} pages</span> : null}
            </div>
          </div>
        </div>
      )}

      {post.doi && (
        <div className="px-4 pt-2 text-xs"><a href={`https://doi.org/${post.doi}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">doi:{post.doi}</a></div>
      )}

      <footer className="px-2 pt-2 pb-3">
        <div className="flex items-center">
          <button onClick={toggleLike} className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-[var(--foreground)]/5 text-sm" aria-pressed={post.is_liked} aria-label={post.is_liked ? 'Unlike' : 'Like'}>
            <Heart size={20} className={post.is_liked ? 'fill-red-500 text-red-500' : ''} />
            <span>{compactNumber(post.like_count)}</span>
          </button>
          <button onClick={() => setShowComments((s) => !s)} className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-[var(--foreground)]/5 text-sm" aria-expanded={showComments} aria-label="Comments">
            <MessageCircle size={20} />
            <span>{compactNumber(post.comment_count)}</span>
          </button>
          <button onClick={share} className="px-2 py-1.5 rounded-full hover:bg-[var(--foreground)]/5" aria-label="Share"><Share2 size={19} /></button>
          <button onClick={toggleBookmark} className="ml-auto px-2 py-1.5 rounded-full hover:bg-[var(--foreground)]/5" aria-pressed={post.is_bookmarked} aria-label={post.is_bookmarked ? 'Remove from saved' : 'Save'}>
            <Bookmark size={20} className={post.is_bookmarked ? 'fill-[var(--foreground)]' : ''} />
          </button>
        </div>
        {showComments && (
          <div className="px-2 pt-3">
            <Comments kind="post" id={post.id} ownerId={post.author_id} onCountChange={(d) => setPost((p) => ({ ...p, comment_count: p.comment_count + d }))} />
          </div>
        )}
      </footer>

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} postId={post.id} />
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete post?">
        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-400">This can&apos;t be undone.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-xl text-sm bg-[var(--foreground)]/5">Cancel</button>
            <button onClick={remove} className="px-4 py-2 rounded-xl text-sm bg-red-600 text-white font-semibold">Delete</button>
          </div>
        </div>
      </Modal>
    </article>
  );
}
