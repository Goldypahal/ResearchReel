"use client";

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BadgeCheck, CalendarPlus } from 'lucide-react';
import { errorMessage, lecturesApi, type Lecture, type LectureInput } from '@/lib/api';
import { EmptyState, ErrorState, LoadingBlock, Spinner } from '@/components/common/States';
import { toast } from '@/components/ui/use-toast';

const DURATIONS = [30, 45, 60, 90, 120, 180];
const SUGGESTED_TOPICS = ['Physics', 'Biology', 'Chemistry', 'Computer Science', 'AI & Machine Learning', 'Medicine', 'Mathematics', 'Astrophysics', 'Earth Sciences', 'Social Sciences'];

/** Date <-> value of an <input type="datetime-local"> in the viewer's timezone. */
const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const defaultStart = () => {
  const d = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  d.setMinutes(0, 0, 0);
  d.setHours(16);
  return toLocalInput(d);
};

interface FormState {
  title: string;
  description: string;
  topic: string;
  tags: string;
  start: string;
  duration: number;
  capacity: string;
  joinUrl: string;
  recordingUrl: string;
}

const fromLecture = (l: Lecture): FormState => ({
  title: l.title,
  description: l.description,
  topic: l.topic,
  tags: l.tags.join(', '),
  start: toLocalInput(new Date(l.starts_at)),
  duration: l.duration_minutes,
  capacity: l.capacity != null ? String(l.capacity) : '',
  joinUrl: l.join_url || '',
  recordingUrl: l.recording_url || '',
});

const inputCls = 'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60';

function Label({ children, hint, htmlFor }: { children: React.ReactNode; hint?: string; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
      {children}
      {hint && <span className="ml-1 font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

function HostForm() {
  const router = useRouter();
  const editId = useSearchParams().get('edit');
  const [canHost, setCanHost] = useState<boolean | null>(null);
  const [original, setOriginal] = useState<Lecture | null>(null);
  const [form, setForm] = useState<FormState | null>(editId ? null : {
    title: '', description: '', topic: '', tags: '', start: defaultStart(), duration: 60, capacity: '', joinUrl: '', recordingUrl: '',
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId) {
      lecturesApi.get(editId)
        .then((l) => {
          if (!l.is_host) throw new Error('Only the host can edit this lecture.');
          setOriginal(l);
          setForm(fromLecture(l));
          setCanHost(true);
        })
        .catch((err) => setLoadError(errorMessage(err)));
    } else {
      lecturesApi.canHost().then((r) => setCanHost(r.can_host)).catch((err) => setLoadError(errorMessage(err)));
    }
  }, [editId]);

  const ended = original?.status === 'ended';
  const started = original ? original.status === 'live' || ended : false;
  const tzName = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  if (loadError) return <ErrorState className="mx-auto mt-16 max-w-md" message={loadError} />;
  if (canHost === null || !form) return <LoadingBlock className="mt-24" />;
  if (!canHost) {
    return (
      <EmptyState
        className="mx-auto mt-16 max-w-lg"
        icon={<BadgeCheck size={20} />}
        title="Hosting is for verified scholars and faculty"
        description="Connect your ORCID iD to get the verified scholar badge, then come back to schedule a lecture."
        action={<Link href="/settings?tab=verification" className="text-sm font-semibold text-primary">Go to verification</Link>}
      />
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const startDate = new Date(form.start);
    if (Number.isNaN(startDate.getTime())) return setError('Choose a start date and time.');

    const full: LectureInput = {
      title: form.title.trim(),
      description: form.description.trim(),
      topic: form.topic.trim(),
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      starts_at: startDate.toISOString(),
      duration_minutes: form.duration,
      capacity: form.capacity.trim() ? Number(form.capacity) : null,
      join_url: form.joinUrl.trim() || null,
      recording_url: form.recordingUrl.trim() || null,
    };

    setSaving(true);
    try {
      let saved: Lecture;
      if (original) {
        // Only send what changed: a lecture that has started can't move its start time.
        const before = fromLecture(original);
        const patch: Partial<LectureInput> = {};
        if (form.title !== before.title) patch.title = full.title;
        if (form.description !== before.description) patch.description = full.description;
        if (form.topic !== before.topic) patch.topic = full.topic;
        if (form.tags !== before.tags) patch.tags = full.tags;
        if (form.start !== before.start) patch.starts_at = full.starts_at;
        if (form.duration !== before.duration) patch.duration_minutes = full.duration_minutes;
        if (form.capacity !== before.capacity) patch.capacity = full.capacity;
        if (form.joinUrl !== before.joinUrl) patch.join_url = full.join_url;
        if (form.recordingUrl !== before.recordingUrl) patch.recording_url = full.recording_url;
        saved = await lecturesApi.update(original.id, patch);
        toast({ title: 'Lecture updated', variant: 'success' });
      } else {
        const { recording_url: _unused, ...create } = full;
        void _unused;
        saved = await lecturesApi.create(create);
        toast({ title: 'Lecture scheduled', description: 'Share the page so people can register.', variant: 'success' });
      }
      router.push(`/lectures/${saved.id}`);
    } catch (err) {
      setError(errorMessage(err, 'We could not save the lecture.'));
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      <Link href={original ? `/lectures/${original.id}` : '/lectures'} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={15} /> {original ? 'Back to lecture' : 'All lectures'}
      </Link>
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"><CalendarPlus size={22} className="text-primary" /> {original ? 'Edit lecture' : 'Host a lecture'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {original ? 'Changes are visible to attendees straight away.' : 'Stream on the platform you already use (Zoom, Google Meet, YouTube Live…). Registered attendees get the link here.'}
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-card p-6" noValidate>
        {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}

        {!ended && (
          <>
            <div>
              <Label htmlFor="title">Title</Label>
              <input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={200} required className={inputCls} placeholder="e.g. Loophole-free Bell tests, explained" />
            </div>
            <div>
              <Label htmlFor="description" hint="(what attendees will learn)">Description</Label>
              <textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={5000} rows={5} className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="topic">Topic</Label>
                <input id="topic" list="topic-options" value={form.topic} onChange={(e) => set('topic', e.target.value)} maxLength={80} required className={inputCls} placeholder="Physics" />
                <datalist id="topic-options">{SUGGESTED_TOPICS.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
              <div>
                <Label htmlFor="tags" hint="(comma separated)">Tags</Label>
                <input id="tags" value={form.tags} onChange={(e) => set('tags', e.target.value)} className={inputCls} placeholder="quantum, entanglement" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <div>
                <Label htmlFor="start" hint={`(${tzName})`}>Starts</Label>
                <input id="start" type="datetime-local" value={form.start} onChange={(e) => set('start', e.target.value)} disabled={started} min={started ? undefined : toLocalInput(new Date())} required className={inputCls} />
              </div>
              <div>
                <Label htmlFor="duration">Duration</Label>
                <select id="duration" value={form.duration} onChange={(e) => set('duration', Number(e.target.value))} className={inputCls}>
                  {[...new Set([...DURATIONS, form.duration])].sort((a, b) => a - b).map((d) => <option key={d} value={d}>{d >= 60 ? `${d / 60} h${d % 60 ? ` ${d % 60} min` : ''}` : `${d} min`}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <div>
                <Label htmlFor="join" hint="(only shown to registered attendees)">Join link</Label>
                <input id="join" type="url" value={form.joinUrl} onChange={(e) => set('joinUrl', e.target.value)} className={inputCls} placeholder="https://zoom.us/j/…" />
              </div>
              <div>
                <Label htmlFor="capacity" hint="(optional)">Seats</Label>
                <input id="capacity" type="number" min={1} max={100000} value={form.capacity} onChange={(e) => set('capacity', e.target.value)} className={inputCls} placeholder="Unlimited" />
              </div>
            </div>
          </>
        )}

        {original && (
          <div>
            <Label htmlFor="recording" hint="(shown to everyone once the lecture has ended)">Recording link</Label>
            <input id="recording" type="url" value={form.recordingUrl} onChange={(e) => set('recordingUrl', e.target.value)} className={inputCls} placeholder="https://youtube.com/watch?v=…" />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href={original ? `/lectures/${original.id}` : '/lectures'} className="text-sm text-muted-foreground hover:text-foreground">Cancel</Link>
          <button type="submit" disabled={saving || (!ended && (!form.title.trim() || !form.topic.trim()))} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {saving ? <Spinner size={16} /> : original ? 'Save changes' : 'Schedule lecture'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function HostLecturePage() {
  return (
    <Suspense fallback={<LoadingBlock className="mt-24" />}>
      <HostForm />
    </Suspense>
  );
}
