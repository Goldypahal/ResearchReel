"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Radio, Users, Calendar, Video, Send, Trash2, Play, Square } from 'lucide-react';
import { lecturesApi, errorMessage, type Lecture, type LectureComment } from '@/lib/api';
import { Avatar, Spinner, ErrorState, Modal, primaryBtn, secondaryBtn, dangerBtn } from '@/components/common';
import { useRealtime } from '@/context/RealtimeContext';
import { formatDateTime, timeAgo } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

export default function LecturePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { on, emit } = useRealtime();
  const [l, setL] = useState<Lecture | null>(null);
  const [comments, setComments] = useState<LectureComment[]>([]);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = () => lecturesApi.get(id).then((x) => { setL(x); setComments(x.comments || []); }).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); emit('join_lecture', id); return () => emit('leave_lecture', id); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => on('lecture_comment', (p) => {
    const c = p as LectureComment & { lecture_id: string };
    if (c.lecture_id !== id) return;
    setComments((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
  }), [on, id]);
  useEffect(() => on('lecture_status', (p) => {
    const s = p as { id: string; status: Lecture['status'] };
    if (s.id === id) setL((cur) => (cur ? { ...cur, status: s.status } : cur));
  }), [on, id]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [comments.length]);

  if (error) return <ErrorState message={error} />;
  if (!l) return <Spinner />;

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast({ title: ok, variant: 'success' }); await load(); }
    catch (err) { toast({ title: 'Something went wrong', description: errorMessage(err), variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try { const c = await lecturesApi.comment(l.id, text.trim()); setComments((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c])); setText(''); }
    catch (err) { toast({ title: 'Message not sent', description: errorMessage(err), variant: 'destructive' }); }
  };

  return (
    <div className="max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
      <div className="space-y-5 min-w-0">
        <Link href="/lectures" className="text-sm text-zinc-500 inline-flex items-center gap-1.5"><ArrowLeft size={15} /> Lectures</Link>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
            {l.status === 'live' ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 font-bold"><Radio size={12} className="animate-pulse" /> LIVE NOW</span>
              : l.status === 'scheduled' ? <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-semibold">Upcoming</span>
              : <span className="px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400 font-semibold">Ended</span>}
            <span className="text-zinc-500">{l.format}{l.topic ? ` · ${l.topic}` : ''}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">{l.title}</h1>
          <Link href={`/profile/${l.host_username}`} className="inline-flex items-center gap-2">
            <Avatar src={l.host_avatar_url} name={l.host_name} size={36} />
            <span><span className="font-semibold">{l.host_name}</span>{l.host_institution && <span className="text-sm text-zinc-500"> · {l.host_institution}</span>}</span>
          </Link>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
            {l.scheduled_at && <span className="inline-flex items-center gap-1.5"><Calendar size={15} /> {formatDateTime(l.scheduled_at)}</span>}
            <span className="inline-flex items-center gap-1.5"><Users size={15} /> {l.attendee_count} of {l.max_attendees} registered</span>
          </div>
          {l.description && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{l.description}</p>}
          {l.tags?.length ? <div className="flex flex-wrap gap-1.5">{l.tags.map((t) => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300">#{t}</span>)}</div> : null}
        </div>

        <div className="rounded-2xl border border-[var(--border)] p-4 space-y-3">
          {l.is_host ? (
            <div className="flex flex-wrap gap-2">
              {l.status === 'scheduled' && <button className={primaryBtn} disabled={busy} onClick={() => act(() => lecturesApi.setStatus(l.id, 'start'), 'You are live')}><Play size={15} /> Go live</button>}
              {l.status === 'live' && <button className={dangerBtn} disabled={busy} onClick={() => act(() => lecturesApi.setStatus(l.id, 'end'), 'Lecture ended')}><Square size={15} /> End lecture</button>}
              {l.meeting_url && <a href={l.meeting_url} target="_blank" rel="noopener noreferrer" className={secondaryBtn}><Video size={15} /> Open meeting</a>}
              {l.status === 'scheduled' && l.scheduled_at && <a href={lecturesApi.calendarUrl(l.id)} download className={secondaryBtn}><Calendar size={15} /> Add to calendar</a>}
              <button className={secondaryBtn} onClick={() => setConfirmDelete(true)}><Trash2 size={15} className="text-red-400" /> {l.status === 'scheduled' ? 'Cancel lecture' : 'Delete'}</button>
            </div>
          ) : l.status === 'ended' ? (
            <p className="text-sm text-zinc-500">This lecture has ended.</p>
          ) : l.is_attending ? (
            <div className="flex flex-wrap items-center gap-3">
              {l.meeting_url ? (
                <a href={l.meeting_url} target="_blank" rel="noopener noreferrer" className={primaryBtn}><Video size={15} /> {l.status === 'live' ? 'Join now' : 'Meeting link'}</a>
              ) : <span className="text-sm text-zinc-500">The host hasn&apos;t added a meeting link — follow along in the chat.</span>}
              <span className="text-sm text-emerald-400">You&apos;re registered{l.status === 'scheduled' ? ' — we’ll remind you a day and an hour before, and when it starts.' : '.'}</span>
              {l.status === 'scheduled' && l.scheduled_at && <a href={lecturesApi.calendarUrl(l.id)} download className="text-sm text-indigo-400 hover:underline inline-flex items-center gap-1"><Calendar size={14} /> Add to calendar</a>}
              <button className="text-sm text-zinc-500 hover:text-zinc-300" onClick={() => act(() => lecturesApi.leave(l.id), 'Registration cancelled')}>Cancel registration</button>
            </div>
          ) : (
            <button className={primaryBtn} disabled={busy || l.attendee_count >= l.max_attendees} onClick={() => act(() => lecturesApi.attend(l.id), l.status === 'live' ? 'Joined' : 'Registered')}>
              {l.attendee_count >= l.max_attendees ? 'Lecture is full' : l.status === 'live' ? 'Join lecture' : 'Register'}
            </button>
          )}
        </div>

        {l.attendees && l.attendees.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold">Attendees</h2>
            <div className="flex flex-wrap gap-2">
              {l.attendees.slice(0, 40).map((a) => (
                <Link key={a.username} href={`/profile/${a.username}`} title={a.full_name}><Avatar src={a.avatar_url} name={a.full_name} size={32} /></Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="rounded-2xl border border-[var(--border)] flex flex-col h-[70vh] lg:sticky lg:top-24">
        <h2 className="px-4 py-3 border-b border-[var(--border)] font-semibold text-sm">Discussion</h2>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {comments.length === 0 && <p className="text-sm text-zinc-500">Questions and comments appear here in real time.</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar src={c.avatar_url} name={c.full_name} size={26} />
              <div className="min-w-0 text-sm"><span className="font-semibold text-xs mr-1.5">{c.full_name}</span><span className="text-[11px] text-zinc-500">{timeAgo(c.created_at)}</span><p className="break-words">{c.content}</p></div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="p-3 border-t border-[var(--border)] flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Ask a question…" aria-label="Message"
            className="flex-1 px-3 py-2 rounded-xl bg-[var(--foreground)]/5 border border-[var(--border)] text-sm focus:outline-none" />
          <button disabled={!text.trim()} className="px-3 rounded-xl bg-indigo-600 text-white disabled:opacity-40" aria-label="Send"><Send size={15} /></button>
        </form>
      </aside>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={l.status === 'scheduled' ? 'Cancel lecture?' : 'Delete lecture?'}>
        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-400">{l.status === 'scheduled' && l.attendee_count > 1 ? 'Everyone who registered will be told it was cancelled. ' : ''}Registrations and chat will be removed.</p>
          <div className="flex justify-end gap-2"><button className={secondaryBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button className={dangerBtn} onClick={async () => { try { await lecturesApi.remove(l.id); router.replace('/lectures'); } catch (err) { toast({ title: 'Could not delete', description: errorMessage(err), variant: 'destructive' }); } }}>Delete</button></div>
        </div>
      </Modal>
    </div>
  );
}
