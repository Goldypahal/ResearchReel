"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { lecturesApi, errorMessage } from '@/lib/api';
import { inputClass, primaryBtn } from '@/components/common';

const FORMATS = ['Lecture', 'Seminar', 'Workshop', 'Panel discussion', 'Journal club', 'Q&A / office hours'];

export default function HostLecturePage() {
  const router = useRouter();
  const [f, setF] = useState({ title: '', description: '', topic: '', tags: '', format: 'Lecture', when: '', max: 200, meeting_url: '', start_now: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.start_now && !f.when) return setError('Pick a date and time, or start now.');
    if (!f.start_now && new Date(f.when) < new Date()) return setError('The start time must be in the future.');
    setBusy(true); setError('');
    try {
      const l = await lecturesApi.create({
        title: f.title.trim(), description: f.description.trim(), topic: f.topic.trim(), tags: f.tags, format: f.format,
        scheduled_at: f.start_now ? new Date().toISOString() : new Date(f.when).toISOString(), start_now: f.start_now,
        max_attendees: f.max, meeting_url: f.meeting_url.trim() || undefined,
      });
      router.push(`/lectures/${l.id}`);
    } catch (err) { setError(errorMessage(err)); setBusy(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link href="/lectures" className="text-sm text-zinc-500 inline-flex items-center gap-1.5"><ArrowLeft size={15} /> Lectures</Link>
      <h1 className="text-2xl font-bold">Host a lecture</h1>
      <form onSubmit={submit} className="space-y-4">
        <input className={inputClass} placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} required />
        <textarea className={`${inputClass} min-h-28`} placeholder="What will you cover? Who is it for?" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={3000} />
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={inputClass} placeholder="Topic, e.g. Quantum optics" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} maxLength={120} />
          <select className={inputClass} value={f.format} onChange={(e) => setF({ ...f, format: e.target.value })} aria-label="Format">{FORMATS.map((x) => <option key={x}>{x}</option>)}</select>
          <input className={inputClass} placeholder="Tags (comma separated)" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><span className="text-zinc-400 shrink-0">Capacity</span><input type="number" min={2} max={5000} className={inputClass} value={f.max} onChange={(e) => setF({ ...f, max: Number(e.target.value) || 2 })} /></label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">Meeting link</span>
          <input className={inputClass} placeholder="https://zoom.us/j/… or https://meet.google.com/…" value={f.meeting_url} onChange={(e) => setF({ ...f, meeting_url: e.target.value })} />
          <span className="text-xs text-zinc-500">Shown only to people who register. You can run the talk on any video platform.</span>
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-indigo-500" checked={f.start_now} onChange={(e) => setF({ ...f, start_now: e.target.checked })} /> Go live now</label>
        {!f.start_now && <input type="datetime-local" className={inputClass} value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} aria-label="Start time" />}
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <button className={`${primaryBtn} w-full`} disabled={busy || !f.title.trim()}>{busy && <Loader2 size={16} className="animate-spin" />} {f.start_now ? 'Go live' : 'Schedule lecture'}</button>
      </form>
    </div>
  );
}
