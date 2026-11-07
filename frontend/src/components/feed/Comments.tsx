"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Avatar, Spinner, UserLink } from '@/components/common';
import { reelsApi, errorMessage, type Comment } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { timeAgo } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';
import RichText from './RichText';

/** Flat comment list for a reel. Posts use the threaded CommentThread. */
export default function Comments({ id, ownerId, onCountChange }: { kind?: 'reel'; id: string; ownerId: string; onCountChange?: (delta: number) => void }) {
  const { user } = useAuth();
  const api = reelsApi;
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setComments(await api.comments(id)); } catch (err) { setError(errorMessage(err)); }
  }, [api, id]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const c = await api.addComment(id, text.trim());
      setComments((prev) => [...(prev || []), c]);
      setText('');
      onCountChange?.(1);
    } catch (err) {
      toast({ title: 'Could not post comment', description: errorMessage(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const remove = async (c: Comment) => {
    try {
      await api.deleteComment(c.id);
      setComments((prev) => (prev || []).filter((x) => x.id !== c.id));
      onCountChange?.(-1);
    } catch (err) {
      toast({ title: 'Could not delete comment', description: errorMessage(err), variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {comments === null && !error && <Spinner className="py-4" />}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {comments && comments.length === 0 && <p className="text-sm text-zinc-500 py-2">No comments yet. Start the discussion.</p>}
      <ul className="space-y-3">
        {comments?.map((c) => (
          <li key={c.id} className="flex gap-2.5 group">
            <Avatar src={c.avatar_url} name={c.full_name} size={28} />
            <div className="flex-1 min-w-0 text-sm">
              <UserLink username={c.username} fullName={c.full_name} status={c.verification_status} className="text-xs mr-1.5" />
              <span className="text-[11px] text-zinc-500">{timeAgo(c.created_at)}</span>
              <p className="whitespace-pre-wrap break-words"><RichText text={c.content || ''} /></p>
            </div>
            {user && (user.id === c.author_id || user.id === ownerId || user.role !== 'user') && (
              <button onClick={() => remove(c)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-500 hover:text-red-400" aria-label="Delete comment"><Trash2 size={14} /></button>
            )}
          </li>
        ))}
      </ul>
      {user && (
        <form onSubmit={submit} className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Add a comment…" aria-label="Add a comment"
            className="flex-1 bg-transparent text-sm py-2 focus:outline-none placeholder:text-zinc-500" />
          <button disabled={busy || !text.trim()} className="text-sm font-semibold text-indigo-400 disabled:text-zinc-600">Post</button>
        </form>
      )}
    </div>
  );
}
