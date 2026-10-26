"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, MessageCircle, PenSquare, Search, Send, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocial } from '@/context/SocialContext';
import { errorMessage, messagesApi, usersApi, type Conversation, type Message, type UserCard } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { cn, displayName, timeAgo } from '@/lib/utils';
import { EmptyState, ErrorState, LoadingBlock, SkeletonRows } from '@/components/common/States';
import Avatar from '@/components/common/Avatar';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import { toast } from '@/components/ui/use-toast';

const otherPeople = (c: Conversation, meId?: string) => c.participants.filter((p) => p.id !== meId);
const convName = (c: Conversation, meId?: string) => c.group_name || otherPeople(c, meId).map((p) => displayName(p)).join(', ') || 'Just you';

function NewConversation({ onStart, onClose }: { onStart: (username: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<UserCard[] | null>(null);
  useEffect(() => {
    const term = q.trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
    if (term.length < 2) { setResults(null); return; }
    const t = window.setTimeout(() => usersApi.search(term, 8).then(setResults).catch(() => setResults([])), 250);
    return () => window.clearTimeout(t);
  }, [q]);
  return (
    <div className="space-y-2 border-b border-[var(--border)] p-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" aria-label="Search people to message" className="w-full rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 py-2 pl-8 pr-3 text-sm focus:outline-none" />
        </div>
        <button onClick={onClose} aria-label="Cancel" className="rounded p-1.5 hover:bg-[var(--foreground)]/5"><X size={16} /></button>
      </div>
      {results && (results.length === 0 ? <p className="px-1 text-xs text-muted-foreground">No one found.</p> : (
        <ul>
          {results.map((u) => (
            <li key={u.id}>
              <button onClick={() => onStart(u.username)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-[var(--foreground)]/5">
                <Avatar src={u.avatar_url} name={displayName(u)} size="sm" />
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{displayName(u)}</span><span className="text-xs text-muted-foreground">@{u.username}</span></span>
              </button>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

function Thread({ conversation, onActivity }: { conversation: Conversation; onActivity: (msg: Message) => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const lastTypingSent = useRef(0);
  const others = otherPeople(conversation, user?.id);

  const load = useCallback(async () => {
    setError(null);
    try {
      const page = await messagesApi.getMessages(conversation.id);
      setMessages([...page.messages].reverse());
      setCursor(page.nextCursor);
      messagesApi.markAsRead(conversation.id).catch(() => undefined);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [conversation.id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
  useEffect(() => { setMessages(null); load(); }, [load]);

  // Live updates for this conversation.
  useEffect(() => {
    const socket = getSocket();
    socket.emit('join_room', conversation.id);
    const onReceive = (m: Message) => {
      if (m.conversation_id !== conversation.id) return;
      setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
      if (m.sender_id !== user?.id) messagesApi.markAsRead(conversation.id).catch(() => undefined);
      setTyping(false);
    };
    let typingTimer: number | undefined;
    const onTyping = (e: { conversation_id: string; user_id: string }) => {
      if (e.conversation_id !== conversation.id || e.user_id === user?.id) return;
      setTyping(true);
      window.clearTimeout(typingTimer);
      typingTimer = window.setTimeout(() => setTyping(false), 3000);
    };
    socket.on('receive_message', onReceive);
    socket.on('user_typing', onTyping);
    return () => {
      socket.emit('leave_room', conversation.id);
      socket.off('receive_message', onReceive);
      socket.off('user_typing', onTyping);
      window.clearTimeout(typingTimer);
    };
  }, [conversation.id, user?.id]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [messages?.length, typing]);

  const older = async () => {
    if (!cursor) return;
    setLoadingOlder(true);
    try {
      const page = await messagesApi.getMessages(conversation.id, cursor);
      setMessages((prev) => [...[...page.messages].reverse(), ...(prev || [])]);
      setCursor(page.nextCursor);
    } catch (err) {
      toast({ title: 'Could not load older messages', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const m = await messagesApi.sendMessage(conversation.id, text);
      setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
      setDraft('');
      onActivity(m);
    } catch (err) {
      toast({ title: 'Message not sent', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const onType = (v: string) => {
    setDraft(v);
    if (Date.now() - lastTypingSent.current > 1500) {
      lastTypingSent.current = Date.now();
      getSocket().emit('typing', { conversation_id: conversation.id });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <Link href="/messages" className="rounded p-1 md:hidden" aria-label="Back to conversations"><ArrowLeft size={18} /></Link>
        {others[0] && <Avatar src={others[0].avatar_url} name={displayName(others[0])} size="sm" />}
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-sm font-bold">{convName(conversation, user?.id)} {others.length === 1 && <VerifiedBadge status={others[0].verification_status} />}</p>
          {others.length === 1 && <Link href={`/profile/${others[0].username}`} className="text-xs text-muted-foreground hover:underline">@{others[0].username}</Link>}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {error ? <ErrorState message={error} onRetry={load} /> : !messages ? <SkeletonRows rows={4} /> : (
          <>
            {cursor && (
              <div className="text-center">
                <button onClick={older} disabled={loadingOlder} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs hover:bg-[var(--foreground)]/5">{loadingOlder ? 'Loading…' : 'Load older messages'}</button>
              </div>
            )}
            {messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Say hello 👋</p>}
            {messages.map((m, i) => {
              const mine = m.sender_id === user?.id;
              const showTime = i === 0 || +new Date(m.sent_at) - +new Date(messages[i - 1].sent_at) > 10 * 60 * 1000;
              return (
                <React.Fragment key={m.id}>
                  {showTime && <p className="pt-2 text-center text-[11px] text-muted-foreground">{new Date(m.sent_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>}
                  <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <p className={cn('max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm', mine ? 'rounded-br-md bg-indigo-600 text-white' : 'rounded-bl-md bg-[var(--foreground)]/[0.07]')}>{m.content}</p>
                  </div>
                </React.Fragment>
              );
            })}
            {typing && <p className="text-xs text-muted-foreground">typing…</p>}
            <div ref={bottom} />
          </>
        )}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-[var(--border)] p-3">
        <textarea
          aria-label="Message"
          value={draft}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e as unknown as React.FormEvent); } }}
          rows={1}
          maxLength={5000}
          placeholder="Message…"
          className="max-h-32 flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--foreground)]/5 px-4 py-2.5 text-sm focus:border-indigo-500/60 focus:outline-none"
        />
        <button type="submit" disabled={!draft.trim() || sending} aria-label="Send" className="rounded-full bg-indigo-600 px-3.5 text-white hover:bg-indigo-500 disabled:opacity-50">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}

function Inbox() {
  const { user } = useAuth();
  const { refreshBadges } = useSocial();
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get('c');
  const [convs, setConvs] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try { setConvs(await messagesApi.getConversations()); } catch (err) { setError(errorMessage(err)); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
  useEffect(() => { load(); }, [load]);

  // Keep the list live as messages arrive in any conversation.
  useEffect(() => {
    const socket = getSocket();
    const onNew = (m: Message) => {
      setConvs((prev) => {
        if (!prev) return prev;
        const idx = prev.findIndex((c) => c.id === m.conversation_id);
        if (idx === -1) { load(); return prev; }
        const c = prev[idx];
        const isOpen = m.conversation_id === activeId;
        const updated: Conversation = {
          ...c,
          last_message: m.content,
          last_message_time: m.sent_at,
          last_message_sender_id: m.sender_id,
          unread_count: isOpen || m.sender_id === user?.id ? 0 : (c.unread_count || 0) + 1,
        };
        return [updated, ...prev.filter((x) => x.id !== c.id)];
      });
    };
    socket.on('new_message', onNew);
    return () => { socket.off('new_message', onNew); };
  }, [activeId, user?.id, load]);

  // Opening a conversation clears its unread count.
  useEffect(() => {
    if (!activeId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
    setConvs((prev) => prev?.map((c) => (c.id === activeId ? { ...c, unread_count: 0 } : c)) || prev);
    const t = window.setTimeout(refreshBadges, 800);
    return () => window.clearTimeout(t);
  }, [activeId, refreshBadges]);

  const start = async (username: string) => {
    try {
      const c = await messagesApi.startConversation(username);
      setComposing(false);
      await load();
      router.replace(`/messages?c=${c.id}`);
    } catch (err) {
      toast({ title: 'Could not start conversation', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (convs || []).filter((c) => !q || convName(c, user?.id).toLowerCase().includes(q) || otherPeople(c, user?.id).some((p) => p.username.toLowerCase().includes(q)));
  }, [convs, filter, user?.id]);
  const active = convs?.find((c) => c.id === activeId) || null;

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!convs) return <LoadingBlock />;

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-4rem)] md:mx-auto md:my-0 md:h-[calc(100vh-7rem)] md:max-w-5xl md:overflow-hidden md:rounded-2xl md:border md:border-[var(--border)]">
      <aside className={cn('w-full flex-col border-r border-[var(--border)] md:flex md:w-80', active ? 'hidden' : 'flex')}>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h1 className="text-lg font-bold">Messages</h1>
          <button onClick={() => setComposing(true)} aria-label="New message" className="rounded-lg p-1.5 hover:bg-[var(--foreground)]/5"><PenSquare size={18} /></button>
        </div>
        {composing && <NewConversation onStart={start} onClose={() => setComposing(false)} />}
        {convs.length > 6 && !composing && (
          <div className="p-3"><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter conversations" aria-label="Filter conversations" className="w-full rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-xs" /></div>
        )}
        <div className="flex-1 overflow-y-auto">
          {convs.length === 0 && !composing ? (
            <EmptyState className="m-4 border-0" icon={<MessageCircle size={20} />} title="No messages yet" description="Message a researcher from their profile, or start a conversation here." action={<button onClick={() => setComposing(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">New message</button>} />
          ) : (
            <ul>
              {shown.map((c) => {
                const other = otherPeople(c, user?.id)[0];
                const unread = c.unread_count > 0;
                return (
                  <li key={c.id}>
                    <button onClick={() => router.replace(`/messages?c=${c.id}`)} className={cn('flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--foreground)]/5', c.id === activeId && 'bg-[var(--foreground)]/[0.06]')}>
                      <Avatar src={other?.avatar_url} name={convName(c, user?.id)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={cn('truncate text-sm', unread ? 'font-bold' : 'font-semibold')}>{convName(c, user?.id)}</p>
                          {c.last_message_time && <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(c.last_message_time)}</span>}
                        </div>
                        <p className={cn('truncate text-xs', unread ? 'font-semibold text-[var(--foreground)]' : 'text-muted-foreground')}>
                          {c.last_message ? `${c.last_message_sender_id === user?.id ? 'You: ' : ''}${c.last_message}` : 'No messages yet'}
                        </p>
                      </div>
                      {unread && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">{c.unread_count}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
      <section className={cn('min-w-0 flex-1', active ? 'flex flex-col' : 'hidden md:flex md:flex-col')}>
        {active ? (
          <Thread key={active.id} conversation={active} onActivity={(m) => setConvs((prev) => prev && [{ ...active, last_message: m.content, last_message_time: m.sent_at, last_message_sender_id: m.sender_id, unread_count: 0 }, ...prev.filter((x) => x.id !== active.id)])} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <MessageCircle size={32} className="text-indigo-400" />
            Select a conversation
          </div>
        )}
      </section>
    </div>
  );
}

export default function MessagesPage() {
  return <Suspense fallback={<LoadingBlock />}><Inbox /></Suspense>;
}
