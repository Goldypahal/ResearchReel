"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CalendarPlus, CheckCircle2, Clock, Copy, EyeOff, Eye, ExternalLink, MessageSquare, Pencil,
  PlayCircle, Send, Trash2, Users, Video, XCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  ApiError, errorMessage, lectureIcs, lecturesApi,
  type Lecture, type LectureAttendee, type LectureQuestion,
} from '@/lib/api';
import { EmptyState, ErrorState, LoadingBlock, Spinner } from '@/components/common/States';
import Avatar from '@/components/common/Avatar';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import { formatWhen, StatusPill } from '@/components/lectures/LectureBits';
import { toast } from '@/components/ui/use-toast';
import { cn, displayName, timeAgo } from '@/lib/utils';

/** Links open a few minutes early so attendees can join before the start. */
const JOIN_WINDOW_MS = 15 * 60 * 1000;

function downloadIcs(lecture: Lecture) {
  const blob = new Blob([lectureIcs(lecture, window.location.href)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${lecture.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'lecture'}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function Questions({ lecture }: { lecture: Lecture }) {
  const { user } = useAuth();
  const [items, setItems] = useState<LectureQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await lecturesApi.questions(lecture.id));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [lecture.id]);

  useEffect(() => {
     
    load();
    // Keep the thread fresh while the lecture is running.
    if (lecture.status !== 'live') return;
    const t = window.setInterval(load, 15000);
    return () => window.clearInterval(t);
  }, [load, lecture.status]);

  const canAsk = Boolean(user) && (lecture.is_host || lecture.is_registered) && lecture.status !== 'cancelled';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const q = await lecturesApi.ask(lecture.id, body);
      setItems((prev) => [...(prev || []), q]);
      setDraft('');
    } catch (err) {
      toast({ title: 'Question not sent', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const moderate = async (q: LectureQuestion, patch: { is_answered?: boolean; is_hidden?: boolean }) => {
    setItems((prev) => prev?.map((x) => (x.id === q.id ? { ...x, ...patch } : x)) || prev);
    try {
      await lecturesApi.moderate(lecture.id, q.id, patch);
    } catch (err) {
      toast({ title: 'Could not update question', description: errorMessage(err), variant: 'destructive' });
      load();
    }
  };

  const remove = async (q: LectureQuestion) => {
    setItems((prev) => prev?.filter((x) => x.id !== q.id) || prev);
    try {
      await lecturesApi.removeQuestion(lecture.id, q.id);
    } catch (err) {
      toast({ title: 'Could not delete question', description: errorMessage(err), variant: 'destructive' });
      load();
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><MessageSquare size={18} className="text-primary" /> Questions</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {lecture.is_host ? 'Questions from registered attendees. Mark them answered or hide ones that are off-topic.' : 'Send questions to the host before or during the lecture.'}
      </p>

      {error ? <ErrorState message={error} onRetry={load} /> : !items ? <LoadingBlock /> : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No questions yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((q) => {
            const mine = q.author_id === user?.id;
            return (
              <li key={q.id} className={cn('rounded-xl border border-border p-3', q.is_hidden && 'opacity-60', q.is_answered && 'bg-emerald-500/5')}>
                <div className="flex items-start gap-3">
                  <Avatar src={q.avatar_url} name={displayName(q)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm">
                      <Link href={`/profile/${q.username}`} className="font-semibold hover:underline">{displayName(q)}</Link>
                      <VerifiedBadge status={q.verification_status} size={12} />
                      <span className="text-xs text-muted-foreground">{timeAgo(q.created_at)}</span>
                      {q.is_answered && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500"><CheckCircle2 size={12} /> Answered</span>}
                      {q.is_hidden && <span className="text-xs text-muted-foreground">{lecture.is_host ? 'Hidden' : 'Hidden by host'}</span>}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm">{q.body}</p>
                    {(lecture.is_host || mine) && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        {lecture.is_host && (
                          <>
                            <button onClick={() => moderate(q, { is_answered: !q.is_answered })} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                              <CheckCircle2 size={12} /> {q.is_answered ? 'Mark unanswered' : 'Mark answered'}
                            </button>
                            <button onClick={() => moderate(q, { is_hidden: !q.is_hidden })} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                              {q.is_hidden ? <><Eye size={12} /> Show</> : <><EyeOff size={12} /> Hide</>}
                            </button>
                          </>
                        )}
                        <button onClick={() => remove(q)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-red-400">
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canAsk ? (
        <form onSubmit={submit} className="mt-4 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            placeholder="Ask the host a question"
            aria-label="Your question"
            className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <button type="submit" disabled={sending || !draft.trim()} aria-label="Send question" className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50">
            {sending ? <Spinner size={16} /> : <Send size={16} />}
          </button>
        </form>
      ) : lecture.status !== 'cancelled' && (
        <p className="mt-4 text-sm text-muted-foreground">{user ? 'Register to ask a question.' : <><Link href={`/auth/login?next=/lectures/${lecture.id}`} className="text-primary">Sign in</Link> and register to ask a question.</>}</p>
      )}
    </section>
  );
}

function Attendees({ lectureId }: { lectureId: string }) {
  const [list, setList] = useState<LectureAttendee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { lecturesApi.attendees(lectureId).then(setList).catch((err) => setError(errorMessage(err))); }, [lectureId]);
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-bold"><Users size={17} className="text-primary" /> Attendees {list && <span className="text-muted-foreground">({list.length})</span>}</h2>
      {error ? <p className="text-sm text-red-400">{error}</p> : !list ? <LoadingBlock /> : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one has registered yet. Share the page link to invite people.</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {list.map((a) => (
            <li key={a.id}>
              <Link href={`/profile/${a.username}`} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted">
                <Avatar src={a.avatar_url} name={displayName(a)} size="xs" />
                <span className="truncate text-sm">{displayName(a)}</span>
                <VerifiedBadge status={a.verification_status} size={12} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function LecturePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const l = await lecturesApi.get(id);
      setLecture(l);
      document.title = `${l.title} · ResearchReel`;
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) setNotFound(true);
      else setError(errorMessage(err));
    }
  }, [id]);
   
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);

  if (notFound) {
    return <EmptyState className="mx-auto mt-16 max-w-md" title="Lecture not found" description="It may have been removed, or the link is wrong." action={<Link href="/lectures" className="text-sm font-semibold text-primary">Browse lectures</Link>} />;
  }
  if (error) return <ErrorState className="mx-auto mt-16 max-w-md" message={error} onRetry={load} />;
  if (!lecture) return <LoadingBlock className="mt-24" />;

  const start = new Date(lecture.starts_at).getTime();
  const end = start + lecture.duration_minutes * 60000;
  const joinable = Boolean(lecture.join_url) && now >= start - JOIN_WINDOW_MS && now < end && lecture.status !== 'cancelled';
  const hostName = displayName({ full_name: lecture.host_name, username: lecture.host_username });

  const act = async (fn: () => Promise<Lecture>, success: string) => {
    if (!user) {
      router.push(`/auth/login?next=${encodeURIComponent(`/lectures/${lecture.id}`)}`);
      return;
    }
    setBusy(true);
    try {
      setLecture(await fn());
      toast({ title: success, variant: 'success' });
    } catch (err) {
      toast({ title: 'Something went wrong', description: errorMessage(err), variant: 'destructive' });
      load();
    } finally {
      setBusy(false);
    }
  };

  const cancelLecture = () => {
    if (!window.confirm('Cancel this lecture? Everyone who registered will be notified. This cannot be undone.')) return;
    act(() => lecturesApi.cancel(lecture.id), 'Lecture cancelled. Attendees have been notified.');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied', variant: 'success' });
    } catch {
      toast({ title: 'Copy failed', description: window.location.href, variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <Link href="/lectures" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15} /> All lectures</Link>

      <header className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusPill status={lecture.status} />
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{lecture.topic}</span>
          {lecture.tags.map((t) => <span key={t} className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{t}</span>)}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{lecture.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Link href={`/profile/${lecture.host_username}`} className="flex items-center gap-2 hover:underline">
            <Avatar src={lecture.host_avatar_url} name={hostName} size="sm" />
            <span>
              <span className="flex items-center gap-1 font-semibold">{hostName} <VerifiedBadge status={lecture.host_verification_status} size={13} /></span>
              {lecture.host_institution && <span className="block text-xs text-muted-foreground">{lecture.host_institution}</span>}
            </span>
          </Link>
          <span className="flex items-center gap-1.5 text-muted-foreground"><Clock size={15} /> {formatWhen(lecture.starts_at)} · {lecture.duration_minutes} min</span>
          <span className="flex items-center gap-1.5 text-muted-foreground"><Users size={15} /> {lecture.registered_count}{lecture.capacity != null ? ` / ${lecture.capacity}` : ''} registered</span>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {lecture.status === 'cancelled' ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><XCircle size={16} /> This lecture was cancelled.</p>
          ) : lecture.is_host ? (
            <>
              {lecture.status !== 'ended' && (
                <Link href={`/lectures/host?edit=${lecture.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted"><Pencil size={15} /> Edit</Link>
              )}
              {lecture.status === 'ended' && (
                <Link href={`/lectures/host?edit=${lecture.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted"><PlayCircle size={15} /> {lecture.recording_url ? 'Change recording link' : 'Add recording link'}</Link>
              )}
              {lecture.status === 'upcoming' && (
                <button onClick={cancelLecture} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-500/30 px-4 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"><XCircle size={15} /> Cancel lecture</button>
              )}
            </>
          ) : lecture.status === 'ended' ? null : lecture.is_registered ? (
            <button onClick={() => act(() => lecturesApi.unregister(lecture.id), 'Registration cancelled')} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted disabled:opacity-50">
              <CheckCircle2 size={15} className="text-emerald-500" /> Registered · Cancel
            </button>
          ) : (
            <button onClick={() => act(() => lecturesApi.register(lecture.id), "You're registered")} disabled={busy || lecture.is_full} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {busy ? <Spinner size={15} /> : lecture.is_full ? 'Lecture full' : 'Register'}
            </button>
          )}

          {joinable && lecture.join_url && (
            <a href={lecture.join_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-semibold text-white hover:bg-red-600">
              <Video size={16} /> Join now <ExternalLink size={13} />
            </a>
          )}
          {lecture.recording_url && (
            <a href={lecture.recording_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <PlayCircle size={16} /> Watch recording <ExternalLink size={13} />
            </a>
          )}
          {(lecture.is_registered || lecture.is_host) && lecture.status === 'upcoming' && (
            <button onClick={() => downloadIcs(lecture)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted"><CalendarPlus size={15} /> Add to calendar</button>
          )}
          <button onClick={copyLink} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted"><Copy size={15} /> Copy link</button>
        </div>

        {lecture.status === 'upcoming' && lecture.has_join_url && (lecture.is_registered || lecture.is_host) && !joinable && (
          <p className="mt-3 text-xs text-muted-foreground">The join button appears 15 minutes before the start.</p>
        )}
        {lecture.status !== 'cancelled' && lecture.status !== 'ended' && !lecture.has_join_url && (
          <p className="mt-3 text-xs text-muted-foreground">{lecture.is_host ? 'Add a join link (Zoom, Meet, YouTube Live…) so attendees can watch.' : 'The host has not added a join link yet.'}</p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {lecture.description && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-2 font-bold">About this lecture</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{lecture.description}</p>
            </section>
          )}
          <Questions lecture={lecture} />
        </div>
        <aside className={cn('space-y-6', !lecture.is_host && 'hidden lg:block')}>
          {lecture.is_host ? <Attendees lectureId={lecture.id} /> : (
            <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              <h2 className="mb-2 font-bold text-foreground">How it works</h2>
              <ol className="list-decimal space-y-1.5 pl-4">
                <li>Register to get the join link and add the lecture to your calendar.</li>
                <li>The join button appears 15 minutes before the start.</li>
                <li>Send questions here; the host marks them answered as they go.</li>
              </ol>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
