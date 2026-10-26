"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  MoreHorizontal, MessageCircle, Bookmark, Share2, BookOpen, FileText, Sparkles,
  AlertTriangle, Copy, Trash2, Send, X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { postsApi, REACTIONS, errorMessage, type Comment, type Post, type ReactionType } from '@/lib/api';
import { cn, displayName, formatCount, timeAgo } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import Avatar from '@/components/common/Avatar';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import FollowButton from '@/components/common/FollowButton';
import { Spinner } from '@/components/common/States';
import ResearchPaperReader from '@/components/reader/ResearchPaperReader';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'plagiarism', label: 'Plagiarism or stolen work' },
  { value: 'misinformation', label: 'Scientific misinformation' },
  { value: 'harassment', label: 'Harassment or hate' },
  { value: 'other', label: 'Something else' },
];

const STATUS_LABEL: Record<string, string> = { preprint: 'Preprint', published: 'Published', wip: 'Work in progress' };

interface PostCardProps {
  post: Post;
  onDeleted?: (id: string) => void;
  /** Called when the viewer un-saves a post (used by the Saved page to drop it). */
  onUnsaved?: (id: string) => void;
  /** Start with the comment thread open (single-post page). */
  defaultCommentsOpen?: boolean;
}

export default function PostCard({ post, onDeleted, onUnsaved, defaultCommentsOpen = false }: PostCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const isOwn = user?.id === post.author_id;

  const [reaction, setReaction] = useState<ReactionType | null>(post.viewer_reaction ?? null);
  const [reactionCount, setReactionCount] = useState(post.reaction_count);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saved, setSaved] = useState(post.is_bookmarked);

  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0].value);
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);

  const requireAuth = () => {
    if (user) return true;
    router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
    return false;
  };

  const applyReaction = async (next: ReactionType | null) => {
    if (!requireAuth()) return;
    setPickerOpen(false);
    const prev = { reaction, reactionCount };
    setReaction(next);
    setReactionCount((c) => c + (next && !reaction ? 1 : !next && reaction ? -1 : 0));
    try {
      const res = await postsApi.react(post.id, next);
      setReaction(res.viewer_reaction);
      setReactionCount(res.reaction_count);
    } catch (err) {
      setReaction(prev.reaction);
      setReactionCount(prev.reactionCount);
      toast({ title: 'Reaction failed', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const toggleSave = async () => {
    if (!requireAuth()) return;
    const next = !saved;
    setSaved(next);
    try {
      if (next) await postsApi.bookmark(post.id);
      else {
        await postsApi.unbookmark(post.id);
        onUnsaved?.(post.id);
      }
      toast({ title: next ? 'Saved to your collection' : 'Removed from saved', variant: 'success' });
    } catch (err) {
      setSaved(!next);
      toast({ title: 'Could not update saved posts', description: errorMessage(err), variant: 'destructive' });
    }
  };

  // Count a view once the card has been at least half on screen for a second.
  const cardRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let timer: number | undefined;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        timer = window.setTimeout(() => { postsApi.recordView(post.id); obs.disconnect(); }, 1000);
      } else if (timer) {
        window.clearTimeout(timer);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => { obs.disconnect(); if (timer) window.clearTimeout(timer); };
  }, [post.id]);

  const loadComments = async () => {
    setCommentsError(null);
    try {
      const rows = await postsApi.getComments(post.id);
      setComments(rows);
      setCommentCount(rows.length);
    } catch (err) {
      setCommentsError(errorMessage(err, 'Could not load the discussion.'));
    }
  };

  useEffect(() => {
    if (defaultCommentsOpen) loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments === null) loadComments();
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !requireAuth()) return;
    setPosting(true);
    try {
      const created = await postsApi.addComment(post.id, text);
      setComments((prev) => [...(prev || []), created]);
      setCommentCount((c) => c + 1);
      setDraft('');
      setCommentsOpen(true);
    } catch (err) {
      toast({ title: 'Comment not posted', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setPosting(false);
    }
  };

  const removeComment = async (id: string) => {
    try {
      await postsApi.deleteComment(post.id, id);
      setComments((prev) => (prev || []).filter((c) => c.id !== id));
      setCommentCount((c) => Math.max(0, c - 1));
    } catch (err) {
      toast({ title: 'Could not delete comment', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const postUrl = () => `${window.location.origin}/post/${post.id}`;

  const share = async () => {
    setMenuOpen(false);
    const url = postUrl();
    try {
      if (navigator.share) {
        await navigator.share({ title: post.document_title || `Post by ${displayName(post)}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copied', variant: 'success' });
      }
    } catch {
      // user dismissed the share sheet
    }
  };

  const copyLink = async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(postUrl());
      toast({ title: 'Link copied', variant: 'success' });
    } catch {
      toast({ title: 'Could not copy link', variant: 'destructive' });
    }
  };

  const deletePost = async () => {
    setMenuOpen(false);
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await postsApi.remove(post.id);
      toast({ title: 'Post deleted', variant: 'success' });
      onDeleted?.(post.id);
    } catch (err) {
      toast({ title: 'Could not delete post', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const submitReport = async () => {
    setReporting(true);
    try {
      await postsApi.report(post.id, reportReason, reportDetails.trim() || undefined);
      toast({ title: 'Report submitted', description: 'Our moderators will review it.', variant: 'success' });
      setReportOpen(false);
      setReportDetails('');
    } catch (err) {
      toast({ title: 'Report failed', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setReporting(false);
    }
  };

  const activeReaction = REACTIONS.find((r) => r.type === reaction);
  const hasDocument = post.content_type === 'document' && post.document_url;

  return (
    <article ref={cardRef} className="mx-auto w-full max-w-[600px] border-b border-[var(--border)] pb-6 mb-6 text-[var(--foreground)]">
      {/* Header */}
      <header className="flex items-center justify-between py-3">
        <Link href={`/profile/${post.username}`} className="flex min-w-0 items-center gap-3">
          <Avatar src={post.avatar_url} name={displayName(post)} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="truncate text-sm font-bold hover:underline">{displayName(post)}</span>
              <VerifiedBadge status={post.verification_status} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              @{post.username}
              {post.institution ? ` · ${post.institution}` : ''} · <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {!isOwn && <FollowButton username={post.username} initialFollowing={false} size="sm" className="hidden" />}
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-full p-2 text-muted-foreground hover:bg-[var(--foreground)]/5 hover:text-[var(--foreground)]"
            aria-label="Post options"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </header>

      {/* Body */}
      {post.caption && (
        <p className="mb-3 whitespace-pre-wrap text-[15px] leading-relaxed">{post.caption}</p>
      )}

      {post.content_type === 'image' && !!post.media_urls?.length && (
        <div className={cn('mb-3 grid gap-1 overflow-hidden rounded-xl border border-[var(--border)]', post.media_urls.length > 1 && 'grid-cols-2')}>
          {post.media_urls.slice(0, 4).map((src, i) => (
            <a key={src} href={src} target="_blank" rel="noreferrer" className={cn('relative block bg-[var(--foreground)]/5', post.media_urls!.length === 1 ? 'aspect-video' : 'aspect-square', post.media_urls!.length === 3 && i === 0 && 'row-span-2 aspect-auto')}>
              <Image src={src} alt={post.media_urls!.length > 1 ? `Image ${i + 1} of ${post.media_urls!.length}` : post.caption?.slice(0, 120) || 'Post image'} fill className="object-cover" />
            </a>
          ))}
        </div>
      )}

      {post.content_type !== 'document' && post.doi && (
        <a href={`https://doi.org/${post.doi}`} target="_blank" rel="noreferrer" className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-indigo-400 hover:bg-[var(--foreground)]/5">
          <BookOpen size={12} /> doi:{post.doi}
        </a>
      )}

      {post.content_type === 'document' && (
        <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <FileText size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-sm font-bold">{post.document_title || post.file_name || 'Research paper'}</h3>
              {post.summary_text && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{post.summary_text}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {hasDocument && (
                  <button
                    onClick={() => setReaderOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    <BookOpen size={12} /> Read paper
                  </button>
                )}
                {post.document_id && (
                  <Link
                    href={`/ai/ask?document=${post.document_id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--foreground)]/5"
                  >
                    <Sparkles size={12} className="text-indigo-400" /> Ask AI
                  </Link>
                )}
                {post.doi && (
                  <a
                    href={`https://doi.org/${post.doi}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-indigo-400 hover:underline"
                  >
                    doi:{post.doi}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {(post.tags?.length || post.publication_status) ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {post.publication_status && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              {STATUS_LABEL[post.publication_status]}
            </span>
          )}
          {post.tags?.map((tag) => (
            <Link key={tag} href={`/explore?tag=${encodeURIComponent(tag)}`} className="text-sm text-indigo-400 hover:underline">
              #{tag}
            </Link>
          ))}
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={() => (reaction ? applyReaction(null) : setPickerOpen((o) => !o))}
              onContextMenu={(e) => { e.preventDefault(); setPickerOpen(true); }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--foreground)]/5',
                reaction && 'text-indigo-400'
              )}
              aria-label={reaction ? `Remove reaction (${activeReaction?.label})` : 'React'}
            >
              <span aria-hidden>{activeReaction?.emoji || '💡'}</span>
              <span>{activeReaction?.label || 'React'}</span>
              {reactionCount > 0 && <span className="text-muted-foreground">· {formatCount(reactionCount)}</span>}
            </button>
            {pickerOpen && (
              <div className="absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-full border border-[var(--border)] bg-[var(--background)] p-1 shadow-xl">
                {REACTIONS.map((r) => (
                  <button
                    key={r.type}
                    onClick={() => applyReaction(r.type)}
                    title={r.label}
                    className="rounded-full px-2.5 py-1.5 text-sm hover:bg-[var(--foreground)]/10"
                  >
                    <span aria-hidden>{r.emoji}</span> <span className="text-xs">{r.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={toggleComments}
            className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm hover:bg-[var(--foreground)]/5', commentsOpen && 'text-indigo-400')}
          >
            <MessageCircle size={17} />
            <span>{commentCount > 0 ? formatCount(commentCount) : 'Discuss'}</span>
          </button>
          <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm hover:bg-[var(--foreground)]/5">
            <Share2 size={16} /> <span className="hidden sm:inline">Share</span>
          </button>
        </div>
        <button
          onClick={toggleSave}
          className={cn('rounded-full p-2 hover:bg-[var(--foreground)]/5', saved && 'text-indigo-400')}
          aria-label={saved ? 'Remove from saved' : 'Save'}
          aria-pressed={saved}
        >
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Discussion */}
      {commentsOpen && (
        <div className="mt-3 space-y-3 border-l-2 border-[var(--border)] pl-4">
          {comments === null && !commentsError && <Spinner size={16} />}
          {commentsError && (
            <p className="text-xs text-red-400">
              {commentsError} <button onClick={loadComments} className="underline">Retry</button>
            </p>
          )}
          {comments?.length === 0 && <p className="text-xs text-muted-foreground">No comments yet. Start the discussion.</p>}
          {comments?.map((c) => (
            <div key={c.id} className="group flex gap-2.5">
              <Avatar src={c.avatar_url} name={displayName(c)} size="xs" className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-xs">
                  <Link href={`/profile/${c.username}`} className="font-semibold hover:underline">{displayName(c)}</Link>
                  <VerifiedBadge status={c.verification_status} size={11} />
                  <span className="text-muted-foreground">· {timeAgo(c.created_at)}</span>
                  {(user?.id === c.author_id || isOwn) && (
                    <button
                      onClick={() => removeComment(c.id)}
                      className="ml-auto text-muted-foreground opacity-0 hover:text-red-400 group-hover:opacity-100"
                      aria-label="Delete comment"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {user && (
        <form onSubmit={submitComment} className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3">
          <Avatar src={user.avatar_url} name={displayName(user)} size="xs" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => { if (!commentsOpen) toggleComments(); }}
            placeholder="Add to the discussion…"
            maxLength={2000}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!draft.trim() || posting}
            className="text-indigo-400 disabled:opacity-40"
            aria-label="Post comment"
          >
            {posting ? <Spinner size={14} /> : <Send size={16} />}
          </button>
        </form>
      )}

      {/* Options sheet */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <div className="w-[90%] max-w-xs overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={copyLink} className="flex w-full items-center justify-center gap-2 border-b border-[var(--border)] px-4 py-3.5 text-sm font-semibold hover:bg-[var(--foreground)]/5">
              <Copy size={15} /> Copy link
            </button>
            {isOwn ? (
              <button onClick={deletePost} className="flex w-full items-center justify-center gap-2 border-b border-[var(--border)] px-4 py-3.5 text-sm font-semibold text-red-400 hover:bg-[var(--foreground)]/5">
                <Trash2 size={15} /> Delete post
              </button>
            ) : (
              <button
                onClick={() => { setMenuOpen(false); if (requireAuth()) setReportOpen(true); }}
                className="flex w-full items-center justify-center gap-2 border-b border-[var(--border)] px-4 py-3.5 text-sm font-semibold text-red-400 hover:bg-[var(--foreground)]/5"
              >
                <AlertTriangle size={15} /> Report
              </button>
            )}
            <button onClick={() => setMenuOpen(false)} className="w-full px-4 py-3.5 text-sm text-muted-foreground hover:bg-[var(--foreground)]/5">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Report dialog */}
      {reportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !reporting && setReportOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby={`report-${post.id}`} className="w-[92%] max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 id={`report-${post.id}`} className="font-bold">Report post</h3>
              <button onClick={() => setReportOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--foreground)]/5">
                  <input type="radio" name={`reason-${post.id}`} value={r.value} checked={reportReason === r.value} onChange={() => setReportReason(r.value)} />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Anything else moderators should know? (optional)"
              rows={3}
              maxLength={1000}
              className="mt-3 w-full rounded-lg border border-[var(--border)] bg-transparent p-2 text-sm outline-none focus:border-indigo-500"
            />
            <button
              onClick={submitReport}
              disabled={reporting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
            >
              {reporting && <Spinner size={14} className="text-white" />} Submit report
            </button>
          </div>
        </div>
      )}

      {hasDocument && (
        <ResearchPaperReader
          isOpen={readerOpen}
          onClose={() => setReaderOpen(false)}
          paper={{
            title: post.document_title || post.file_name || 'Research paper',
            author_name: displayName(post),
            doi: post.doi,
            doi_url: post.doi ? `https://doi.org/${post.doi}` : null,
            pdf_url: post.document_url,
            abstract: post.summary_text || undefined,
            tags: post.tags || undefined,
          }}
        />
      )}
    </article>
  );
}
