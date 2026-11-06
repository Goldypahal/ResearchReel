"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Plus, Radio, Users, Calendar } from 'lucide-react';
import { lecturesApi, errorMessage, type Lecture } from '@/lib/api';
import { Avatar, Spinner, ErrorState, EmptyState, primaryBtn } from '@/components/common';
import { formatDateTime } from '@/lib/format';

const FILTERS = [['all', 'All'], ['live', 'Live now'], ['scheduled', 'Upcoming'], ['ended', 'Past']] as const;

export default function LecturesPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all');
  const [items, setItems] = useState<Lecture[] | null>(null);
  const [error, setError] = useState('');
  const load = () => { setItems(null); setError(''); lecturesApi.list(filter === 'all' ? undefined : filter).then(setItems).catch((e) => setError(errorMessage(e))); };
  useEffect(load, [filter]);  

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="text-indigo-400" /> Lectures</h1>
          <p className="text-sm text-zinc-500">Live and upcoming talks hosted by researchers. Register to get the meeting link and a reminder when it starts.</p>
        </div>
        <Link href="/lectures/host" className={primaryBtn}><Plus size={16} /> Host a lecture</Link>
      </div>
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} className={`px-3.5 py-1.5 rounded-full text-sm font-semibold ${filter === id ? 'bg-indigo-600 text-white' : 'bg-[var(--foreground)]/5 text-zinc-400'}`}>{label}</button>
        ))}
      </div>
      {error ? <ErrorState message={error} onRetry={load} /> : !items ? <Spinner /> : items.length === 0 ? (
        <EmptyState icon={<BookOpen size={32} />} title="No lectures here yet" description="Host one to share your research with the community." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((l) => (
            <Link key={l.id} href={`/lectures/${l.id}`} className="rounded-2xl border border-[var(--border)] p-5 hover:border-indigo-500/40 transition-colors space-y-3">
              <div className="flex items-center gap-2 text-xs">
                {l.status === 'live' ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 font-bold"><Radio size={12} className="animate-pulse" /> LIVE</span>
                  : l.status === 'scheduled' ? <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-semibold">Upcoming</span>
                  : <span className="px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400 font-semibold">Ended</span>}
                <span className="text-zinc-500">{l.format}</span>
                {l.topic && <span className="text-zinc-500">· {l.topic}</span>}
              </div>
              <h2 className="font-semibold text-lg leading-snug">{l.title}</h2>
              {l.description && <p className="text-sm text-zinc-500 line-clamp-2">{l.description}</p>}
              <div className="flex items-center gap-2 text-sm">
                <Avatar src={l.host_avatar_url} name={l.host_name} size={26} />
                <span className="font-medium">{l.host_name}</span>
                {l.host_institution && <span className="text-xs text-zinc-500 truncate">· {l.host_institution}</span>}
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                {l.scheduled_at && <span className="inline-flex items-center gap-1"><Calendar size={13} /> {formatDateTime(l.scheduled_at)}</span>}
                <span className="inline-flex items-center gap-1"><Users size={13} /> {l.attendee_count}/{l.max_attendees}</span>
                {l.is_attending && <span className="text-emerald-400 font-semibold">Registered</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
