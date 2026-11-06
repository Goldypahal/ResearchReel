"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Send, PenSquare, MessageCircle, Loader2, Search } from 'lucide-react';
import { messagesApi, searchApi, errorMessage, type Conversation, type Message, type PublicUser } from '@/lib/api';
import { Avatar, Spinner, EmptyState, ErrorState, Modal, VerifiedBadge, inputClass } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { timeAgo } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

const titleOf = (c: Conversation) => c.group_name || c.participants.map((p) => p.full_name).join(', ') || 'Conversation';

function NewMessageModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (username: string) => void }) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<PublicUser[]>([]);
  useEffect(() => {
    if (!q.trim()) { setUsers([]); return; }
    const t = setTimeout(() => { searchApi.search(q.trim(), 'users', 10).then((r) => setUsers(r.users || [])).catch(() => {}); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <Modal open={open} onClose={onClose} title="New message">
      <div className="p-4 space-y-3">
        <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input autoFocus className={`${inputClass} pl-9`} placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <ul className="max-h-80 overflow-y-auto">
          {users.map((u) => (
            <li key={u.id}>
              <button onClick={() => onPick(u.username)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--foreground)]/5 text-left">
                <Avatar src={u.avatar_url} name={u.full_name} size={38} />
                <div className="min-w-0"><p className="text-sm font-semibold flex items-center gap-1">{u.full_name} <VerifiedBadge status={u.verification_status} /></p><p className="text-xs text-zinc-500">@{u.username}</p></div>
              </button>
            </li>
          ))}
          {q.trim() && users.length === 0 && <li className="text-sm text-zinc-500 p-2">No one found.</li>}
        </ul>
      </div>
    </Modal>
  );
}

function ChatView({ conversation, onBack, onSent }: { conversation: Conversation; onBack: () => void; onSent: (m: Message) => void }) {
  const { user } = useAuth();
  const { on, emit } = useRealtime();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState<string | null>(null);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmit = useRef(0);
  const id = conversation.id;

  useEffect(() => {
    setMessages(null); setError('');
    messagesApi.messages(id).then((r) => { setMessages(r.messages); setCursor(r.nextCursor); messagesApi.markRead(id).catch(() => {}); })
      .catch((e) => setError(errorMessage(e)));
    emit('join_conversation', id);
    return () => emit('leave_conversation', id);
  }, [id, emit]);

  useEffect(() => on('receive_message', (payload) => {
    const m = payload as Message;
    if (m.conversation_id !== id) return;
    setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
    if (m.sender_id !== user?.id) messagesApi.markRead(id).catch(() => {});
    setTyping(null);
  }), [on, id, user?.id]);

  useEffect(() => on('user_typing', (payload) => {
    const p = payload as { conversation_id: string; username: string; is_typing: boolean; user_id: string };
    if (p.conversation_id !== id || p.user_id === user?.id) return;
    setTyping(p.is_typing ? p.username : null);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (p.is_typing) typingTimer.current = setTimeout(() => setTyping(null), 4000);
  }), [on, id, user?.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages?.length, typing]);

  const older = async () => {
    if (!cursor) return;
    const r = await messagesApi.messages(id, cursor);
    setMessages((prev) => [...r.messages, ...(prev || [])]); setCursor(r.nextCursor);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      const m = await messagesApi.send(id, content);
      setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
      setText(''); onSent(m);
      emit('typing', { conversation_id: id, is_typing: false });
    } catch (err) { toast({ title: 'Message not sent', description: errorMessage(err), variant: 'destructive' }); }
    finally { setSending(false); }
  };

  const onType = (v: string) => {
    setText(v);
    if (Date.now() - lastTypingEmit.current > 2000) { lastTypingEmit.current = Date.now(); emit('typing', { conversation_id: id, is_typing: true }); }
  };

  const other = conversation.participants[0];

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
        <button onClick={onBack} className="md:hidden" aria-label="Back to conversations"><ArrowLeft size={20} /></button>
        {other && <Link href={`/profile/${other.username}`}><Avatar src={other.avatar_url} name={other.full_name} size={36} /></Link>}
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{titleOf(conversation)}</p>
          {other && <Link href={`/profile/${other.username}`} className="text-xs text-zinc-500 hover:underline">@{other.username}</Link>}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {error && <ErrorState message={error} />}
        {!messages && !error && <Spinner />}
        {cursor && <button onClick={older} className="block mx-auto text-xs text-indigo-400 py-2">Load earlier messages</button>}
        {messages?.length === 0 && <p className="text-center text-sm text-zinc-500 py-10">Say hello 👋</p>}
        {messages?.map((m, i) => {
          const mine = m.sender_id === user?.id;
          const showTime = i === 0 || new Date(m.sent_at).getTime() - new Date(messages[i - 1].sent_at).getTime() > 15 * 60 * 1000;
          return (
            <React.Fragment key={m.id}>
              {showTime && <p className="text-center text-[11px] text-zinc-500 py-2">{new Date(m.sent_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${mine ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-[var(--foreground)]/8 bg-zinc-800/60 rounded-bl-md'}`}>{m.content}</p>
              </div>
            </React.Fragment>
          );
        })}
        {typing && <p className="text-xs text-zinc-500 italic">{typing} is typing…</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="p-3 border-t border-[var(--border)] flex gap-2">
        <input value={text} onChange={(e) => onType(e.target.value)} maxLength={5000} placeholder="Message…" aria-label="Message"
          className="flex-1 px-4 py-2.5 rounded-full bg-[var(--foreground)]/5 border border-[var(--border)] text-sm focus:outline-none focus:border-indigo-500/60" />
        <button disabled={sending || !text.trim()} className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center disabled:opacity-40" aria-label="Send">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}

function MessagesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { on, refreshCounts } = useRealtime();
  const [convos, setConvos] = useState<Conversation[] | null>(null);
  const [error, setError] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const activeId = params.get('c');

  const load = useCallback(() => {
    messagesApi.conversations().then(setConvos).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Keep the list fresh when messages arrive anywhere.
  useEffect(() => on('message_notification', () => load()), [on, load]);

  useEffect(() => {
    if (!activeId) return;
    setConvos((prev) => prev?.map((c) => (c.id === activeId ? { ...c, unread_count: 0 } : c)) || prev);
    refreshCounts();
  }, [activeId, refreshCounts]);

  const active = convos?.find((c) => c.id === activeId) || null;

  // Deep link to a conversation that isn't loaded yet (e.g. just created).
  useEffect(() => {
    if (activeId && convos && !active) messagesApi.conversation(activeId).then((c) => setConvos((prev) => [c, ...(prev || [])])).catch(() => router.replace('/messages'));
  }, [activeId, convos, active, router]);

  const start = async (username: string) => {
    setComposeOpen(false);
    try {
      const c = await messagesApi.start(username);
      setConvos((prev) => [c, ...(prev || []).filter((x) => x.id !== c.id)]);
      router.push(`/messages?c=${c.id}`);
    } catch (err) { toast({ title: 'Could not start conversation', description: errorMessage(err), variant: 'destructive' }); }
  };

  const onSent = (m: Message) => setConvos((prev) => {
    if (!prev) return prev;
    const c = prev.find((x) => x.id === m.conversation_id);
    if (!c) return prev;
    return [{ ...c, last_message: m.content, last_message_time: m.sent_at, last_sender_id: m.sender_id }, ...prev.filter((x) => x.id !== c.id)];
  });

  return (
    <div className="max-w-5xl mx-auto h-[calc(100dvh-9rem)] md:h-[calc(100dvh-7.5rem)] rounded-2xl border border-[var(--border)] overflow-hidden grid md:grid-cols-[320px_1fr]">
      <aside className={`border-r border-[var(--border)] flex-col min-h-0 ${active ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h1 className="font-bold">{user?.username}</h1>
          <button onClick={() => setComposeOpen(true)} aria-label="New message"><PenSquare size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {error && <ErrorState message={error} onRetry={load} />}
          {!convos && !error && <Spinner />}
          {convos?.length === 0 && <EmptyState icon={<MessageCircle size={28} />} title="No messages yet" description="Start a conversation with another researcher." action={<button onClick={() => setComposeOpen(true)} className="text-sm font-semibold text-indigo-400">New message</button>} />}
          <ul>
            {convos?.map((c) => {
              const p = c.participants[0];
              return (
                <li key={c.id}>
                  <button onClick={() => router.push(`/messages?c=${c.id}`)} className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--foreground)]/5 ${c.id === activeId ? 'bg-[var(--foreground)]/5' : ''}`}>
                    <Avatar src={p?.avatar_url} name={p?.full_name || c.group_name} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${c.unread_count ? 'font-bold' : 'font-medium'}`}>{titleOf(c)}</p>
                      <p className={`text-xs truncate ${c.unread_count ? 'text-[var(--foreground)]' : 'text-zinc-500'}`}>
                        {c.last_message ? `${c.last_sender_id === user?.id ? 'You: ' : ''}${c.last_message}` : 'No messages yet'}
                        {c.last_message_time && ` · ${timeAgo(c.last_message_time)}`}
                      </p>
                    </div>
                    {c.unread_count > 0 && <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" aria-label={`${c.unread_count} unread`} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
      <section className={`min-h-0 ${active ? 'flex flex-col' : 'hidden md:flex'}`}>
        {active ? <ChatView conversation={active} onBack={() => router.push('/messages')} onSent={onSent} /> : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-6">
            <MessageCircle size={40} className="text-zinc-600" />
            <p className="font-semibold">Your messages</p>
            <p className="text-sm text-zinc-500">Send private messages to collaborators and colleagues.</p>
            <button onClick={() => setComposeOpen(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">Send message</button>
          </div>
        )}
      </section>
      <NewMessageModal open={composeOpen} onClose={() => setComposeOpen(false)} onPick={start} />
    </div>
  );
}

export default function MessagesPage() {
  return <Suspense fallback={<Spinner />}><MessagesInner /></Suspense>;
}
