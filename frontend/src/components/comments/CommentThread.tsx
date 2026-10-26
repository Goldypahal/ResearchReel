"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, MoreHorizontal, Pencil, Send, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { errorMessage, postsApi, type Comment, type CommentSort } from '@/lib/api';
import { cn, displayName, formatCount, timeAgo } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import Avatar from '@/components/common/Avatar';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import { Spinner } from '@/components/common/States';
import MentionInput, { type MentionInputHandle } from './MentionInput';

/** Comment text with @handles linked to profiles. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/((?:^|(?<=[\s(]))@[A-Za-z0-9_.]{3,30})/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^@([A-Za-z0-9_.]{3,30})$/);
        if (!m) return <React.Fragment key={i}>{p}</React.Fragment>;
        const handle = m[1].replace(/\.+$/, '');
        return (
          <React.Fragment key={i}>
            <Link href={`/profile/${handle}`} className="font-medium text-indigo-400 hover:underline">@{handle}</Link>
            {m[1].slice(handle.length)}
          </React.Fragment>
        );
      })}
    </>
  );
}

interface Ctx {
  postId: string;
  postAuthorId: string;
  onCountChange: (delta: number) => void;
}

function Composer({ postId, parentId, initial = '', autoFocus, onPosted, onCancel, placeholder }: {
  postId: string;
  parentId?: string | null;
  initial?: string;
  autoFocus?: boolean;
  placeholder: string;
  onPosted: (c: Comment) => void;
  onCancel?: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const input = useRef<MentionInputHandle>(null);

  useEffect(() => { if (autoFocus) input.current?.focus(); }, [autoFocus]);

  if (!user) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        <button onClick={() => router.push(`/auth/login?next=${encodeURIComponent(`/post/${postId}`)}`)} className="font-medium text-indigo-400 hover:underline">Sign in</button> to join the discussion.
      </p>
    );
  }

  const submit = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const created = await postsApi.addComment(postId, text, parentId);
      setDraft('');
      onPosted(created);
    } catch (err) {
      toast({ title: 'Comment not posted', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-start gap-2">
      <Avatar src={user.avatar_url} name={displayName(user)} size="xs" className="mt-1" />
      <MentionInput ref={input} value={draft} onChange={setDraft} onSubmit={submit} placeholder={placeholder} ariaLabel={parentId ? 'Write a reply' : 'Write a comment'} disabled={busy} />
      {onCancel && (
        <button type="button" onClick={onCancel} className="mt-1 text-xs text-muted-foreground hover:text-[var(--foreground)]">Cancel</button>
      )}
      <button type="submit" disabled={!draft.trim() || busy} aria-label={parentId ? 'Post reply' : 'Post comment'} className="mt-1 text-indigo-400 disabled:opacity-40">
        {busy ? <Spinner size={14} /> : <Send size={16} />}
      </button>
    </form>
  );
}

function CommentRow({ comment, ctx, onReply, onChanged, onRemoved, isReply }: {
  comment: Comment;
  ctx: Ctx;
  isReply: boolean;
  onReply: (c: Comment) => void;
  onChanged: (c: Comment) => void;
  onRemoved: (c: Comment) => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content || '');
  const [saving, setSaving] = useState(false);
  const [menu, setMenu] = useState(false);

  const mine = Boolean(user) && user!.id === comment.author_id;
  const canDelete = mine || (Boolean(user) && user!.id === ctx.postAuthorId);
  const name = displayName({ full_name: comment.full_name, username: comment.username || '' });

  if (comment.is_deleted) {
    return <p className="py-1 text-sm italic text-muted-foreground">Comment deleted</p>;
  }

  const like = async () => {
    if (!user) { router.push(`/auth/login?next=${encodeURIComponent(`/post/${ctx.postId}`)}`); return; }
    const next = !comment.viewer_liked;
    onChanged({ ...comment, viewer_liked: next, like_count: comment.like_count + (next ? 1 : -1) });
    try {
      const r = await postsApi.likeComment(ctx.postId, comment.id, next);
      onChanged({ ...comment, viewer_liked: r.viewer_liked, like_count: r.like_count });
    } catch (err) {
      onChanged(comment);
      toast({ title: 'Could not update like', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const saveEdit = async () => {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      onChanged(await postsApi.editComment(ctx.postId, comment.id, text));
      setEditing(false);
    } catch (err) {
      toast({ title: 'Could not save', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setMenu(false);
    if (!window.confirm(comment.reply_count > 0 ? 'Delete this comment? Its replies will stay.' : 'Delete this comment?')) return;
    try {
      await postsApi.deleteComment(ctx.postId, comment.id);
      onRemoved(comment);
    } catch (err) {
      toast({ title: 'Could not delete', description: errorMessage(err), variant: 'destructive' });
    }
  };

  return (
    <div id={`comment-${comment.id}`} className="group flex gap-2.5">
      <Link href={`/profile/${comment.username}`} className="shrink-0">
        <Avatar src={comment.avatar_url} name={name} size={isReply ? 'xs' : 'sm'} className="mt-0.5" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
          <Link href={`/profile/${comment.username}`} className="font-semibold hover:underline">{name}</Link>
          <VerifiedBadge status={comment.verification_status} size={11} />
          {comment.is_post_author && <span className="rounded bg-indigo-500/15 px-1.5 py-px text-[10px] font-semibold text-indigo-400">Author</span>}
          <span className="text-muted-foreground">{timeAgo(comment.created_at)}{comment.edited_at && ' · edited'}</span>
          {canDelete && !editing && (
            <div className="relative ml-auto">
              <button onClick={() => setMenu((m) => !m)} aria-label="Comment options" className="rounded p-0.5 text-muted-foreground opacity-60 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100">
                <MoreHorizontal size={14} />
              </button>
              {menu && (
                <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm shadow-xl" onMouseLeave={() => setMenu(false)}>
                  {mine && (
                    <button onClick={() => { setMenu(false); setDraft(comment.content || ''); setEditing(true); }} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-[var(--foreground)]/5">
                      <Pencil size={13} /> Edit
                    </button>
                  )}
                  <button onClick={remove} className="flex w-full items-center gap-2 px-3 py-2 text-red-400 hover:bg-[var(--foreground)]/5">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-1 rounded-lg border border-[var(--border)] px-2 py-1">
            <MentionInput value={draft} onChange={setDraft} onSubmit={saveEdit} ariaLabel="Edit comment" autoFocus disabled={saving} />
            <div className="flex justify-end gap-3 pb-1 text-xs">
              <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-[var(--foreground)]">Cancel</button>
              <button onClick={saveEdit} disabled={!draft.trim() || saving} aria-label="Save comment" className="font-semibold text-indigo-400 disabled:opacity-40">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">
            {isReply && comment.reply_to_username && !comment.content?.startsWith(`@${comment.reply_to_username}`) && (
              <Link href={`/profile/${comment.reply_to_username}`} className="mr-1 text-indigo-400 hover:underline">@{comment.reply_to_username}</Link>
            )}
            <RichText text={comment.content || ''} />
          </p>
        )}

        {!editing && (
          <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
            <button onClick={like} aria-pressed={comment.viewer_liked} aria-label={comment.viewer_liked ? 'Unlike comment' : 'Like comment'} className={cn('inline-flex items-center gap-1 hover:text-[var(--foreground)]', comment.viewer_liked && 'text-rose-400 hover:text-rose-300')}>
              <Heart size={13} fill={comment.viewer_liked ? 'currentColor' : 'none'} />
              {comment.like_count > 0 && formatCount(comment.like_count)}
            </button>
            <button onClick={() => onReply(comment)} className="font-medium hover:text-[var(--foreground)]">Reply</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** A top-level comment with its (lazily loaded) replies and reply box. */
function Thread({ comment, ctx, onChanged, onRemoved }: {
  comment: Comment;
  ctx: Ctx;
  onChanged: (c: Comment) => void;
  onRemoved: (c: Comment) => void;
}) {
  const [replies, setReplies] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  const load = async (more: boolean) => {
    setLoading(true);
    try {
      const page = await postsApi.getReplies(ctx.postId, comment.id, more ? cursor : null);
      setReplies((prev) => (more ? [...prev, ...page.items.filter((r) => !prev.some((p) => p.id === r.id))] : page.items));
      setCursor(page.nextCursor);
      setLoaded(true);
    } catch (err) {
      toast({ title: 'Could not load replies', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded) load(false);
  };

  const startReply = (target: Comment) => {
    setReplyTo(target);
    if (!open) { setOpen(true); if (!loaded) load(false); }
  };

  const posted = (c: Comment) => {
    setReplies((prev) => [...prev, c]);
    onChanged({ ...comment, reply_count: comment.reply_count + 1 });
    ctx.onCountChange(1);
    setReplyTo(null);
  };

  const hidden = comment.reply_count - replies.length;

  return (
    <li className="space-y-2">
      <CommentRow comment={comment} ctx={ctx} isReply={false} onReply={startReply} onChanged={onChanged} onRemoved={onRemoved} />
      {(comment.reply_count > 0 || replyTo) && (
        <div className="ml-10 space-y-2 border-l border-[var(--border)] pl-3">
          {comment.reply_count > 0 && (!open || (hidden > 0 && cursor)) && (
            <button onClick={open ? () => load(true) : toggle} disabled={loading} className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-[var(--foreground)]">
              <span className="h-px w-5 bg-[var(--border)]" />
              {loading ? <Spinner size={12} /> : open ? `View more replies (${hidden})` : `View ${comment.reply_count} ${comment.reply_count === 1 ? 'reply' : 'replies'}`}
            </button>
          )}
          {open && (
            <ul className="space-y-2">
              {replies.map((r) => (
                <li key={r.id}>
                  <CommentRow
                    comment={r}
                    ctx={ctx}
                    isReply
                    onReply={startReply}
                    onChanged={(c) => setReplies((prev) => prev.map((x) => (x.id === c.id ? c : x)))}
                    onRemoved={(c) => {
                      setReplies((prev) => prev.filter((x) => x.id !== c.id));
                      onChanged({ ...comment, reply_count: Math.max(0, comment.reply_count - 1) });
                      ctx.onCountChange(-1);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
          {open && comment.reply_count > 0 && !cursor && loaded && (
            <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-[var(--foreground)]">Hide replies</button>
          )}
          {replyTo && (
            <Composer
              key={replyTo.id}
              postId={ctx.postId}
              parentId={replyTo.id}
              initial={replyTo.username && replyTo.id !== comment.id ? `@${replyTo.username} ` : ''}
              placeholder={`Reply to ${displayName({ full_name: replyTo.full_name, username: replyTo.username || '' })}…`}
              autoFocus
              onPosted={posted}
              onCancel={() => setReplyTo(null)}
            />
          )}
        </div>
      )}
    </li>
  );
}

/**
 * The discussion under a post: top-level comments (Top or Newest) with
 * threaded replies, likes, edits and @mentions.
 */
export default function CommentThread({ postId, postAuthorId, onCountChange }: {
  postId: string;
  postAuthorId: string;
  onCountChange: (delta: number) => void;
}) {
  const [sort, setSort] = useState<CommentSort>('top');
  const [items, setItems] = useState<Comment[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const generation = useRef(0);

  const load = useCallback(async (s: CommentSort) => {
    const gen = ++generation.current;
    try {
      const page = await postsApi.getComments(postId, s, null);
      if (gen !== generation.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
      setError(null);
    } catch (err) {
      if (gen === generation.current) setError(errorMessage(err, 'Could not load the discussion.'));
    }
  }, [postId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
  useEffect(() => { load(sort); }, [load, sort]);

  const more = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await postsApi.getComments(postId, sort, cursor);
      setItems((prev) => [...(prev || []), ...page.items.filter((c) => !(prev || []).some((p) => p.id === c.id))]);
      setCursor(page.nextCursor);
    } catch (err) {
      toast({ title: 'Could not load more', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setLoadingMore(false);
    }
  };

  const ctx: Ctx = { postId, postAuthorId, onCountChange };
  const replace = (c: Comment) => setItems((prev) => prev?.map((x) => (x.id === c.id ? c : x)) || prev);
  const removed = (c: Comment) => {
    onCountChange(-1);
    // A comment with replies stays as "Comment deleted"; otherwise it disappears.
    setItems((prev) => (c.reply_count > 0
      ? prev?.map((x) => (x.id === c.id ? { ...x, is_deleted: true, content: null } : x)) || prev
      : prev?.filter((x) => x.id !== c.id) || prev));
  };

  return (
    <div className="mt-3 space-y-4 border-t border-[var(--border)] pt-3">
      <Composer
        postId={postId}
        placeholder="Add to the discussion…"
        onPosted={(c) => { setItems((prev) => [c, ...(prev || [])]); onCountChange(1); }}
      />

      {items && items.length > 1 && (
        <div className="flex items-center gap-1 text-xs" role="tablist" aria-label="Sort comments">
          {(['top', 'new'] as const).map((s) => (
            <button key={s} role="tab" aria-selected={sort === s} onClick={() => setSort(s)} className={cn('rounded-full px-2.5 py-1', sort === s ? 'bg-[var(--foreground)]/10 font-semibold' : 'text-muted-foreground hover:text-[var(--foreground)]')}>
              {s === 'top' ? 'Top' : 'Newest'}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p className="text-xs text-red-400">{error} <button onClick={() => load(sort)} className="underline">Retry</button></p>
      ) : items === null ? (
        <Spinner size={16} />
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet. Start the discussion.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((c) => <Thread key={c.id} comment={c} ctx={ctx} onChanged={replace} onRemoved={removed} />)}
        </ul>
      )}

      {cursor && (
        <button onClick={more} disabled={loadingMore} className="text-xs font-medium text-muted-foreground hover:text-[var(--foreground)]">
          {loadingMore ? <Spinner size={12} /> : 'View more comments'}
        </button>
      )}
    </div>
  );
}
