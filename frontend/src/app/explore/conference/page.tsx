"use client";

import React, { useEffect, useState } from 'react';
import { Calendar, Plus, MapPin, ExternalLink, Bell, BellOff, Trash2, Search } from 'lucide-react';
import { conferencesApi, errorMessage, type Conference } from '@/lib/api';
import { Spinner, ErrorState, EmptyState, Modal, inputClass, primaryBtn, secondaryBtn } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

const daysUntil = (d: string | null) => {
  if (!d) return null;
  const ms = new Date(`${d}T23:59:59`).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
};

function AddConference({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (c: Conference) => void }) {
  const [f, setF] = useState({ name: '', acronym: '', field: '', location: '', start_date: '', end_date: '', submission_deadline: '', website_url: '', description: '' });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || undefined]));
      const c = await conferencesApi.create(body as Partial<Conference>);
      onAdded(c); onClose();
      setF({ name: '', acronym: '', field: '', location: '', start_date: '', end_date: '', submission_deadline: '', website_url: '', description: '' });
    } catch (err) { toast({ title: 'Could not add conference', description: errorMessage(err), variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add a conference" wide>
      <div className="p-5 grid sm:grid-cols-2 gap-3 text-sm">
        <input className={`${inputClass} sm:col-span-2`} placeholder="Name, e.g. International Conference on Machine Learning" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={inputClass} placeholder="Acronym, e.g. ICML 2027" value={f.acronym} onChange={(e) => setF({ ...f, acronym: e.target.value })} />
        <input className={inputClass} placeholder="Field" value={f.field} onChange={(e) => setF({ ...f, field: e.target.value })} />
        <input className={inputClass} placeholder="Location" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
        <input className={inputClass} placeholder="Website (https://…)" value={f.website_url} onChange={(e) => setF({ ...f, website_url: e.target.value })} />
        <label className="space-y-1"><span className="text-zinc-400">Submission deadline</span><input type="date" className={inputClass} value={f.submission_deadline} onChange={(e) => setF({ ...f, submission_deadline: e.target.value })} /></label>
        <label className="space-y-1"><span className="text-zinc-400">Starts</span><input type="date" className={inputClass} value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></label>
        <label className="space-y-1"><span className="text-zinc-400">Ends</span><input type="date" className={inputClass} value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></label>
        <textarea className={`${inputClass} sm:col-span-2 min-h-20`} placeholder="Notes (topics, page limits, etc.)" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <div className="sm:col-span-2 flex justify-end gap-2"><button className={secondaryBtn} onClick={onClose}>Cancel</button><button className={primaryBtn} onClick={submit} disabled={busy || !f.name.trim()}>Add conference</button></div>
      </div>
    </Modal>
  );
}

export default function ConferencesPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<'all' | 'following'>('all');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Conference[] | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = () => { setItems(null); setError(''); conferencesApi.list({ scope: scope === 'following' ? 'following' : undefined, q: q.trim() || undefined }).then(setItems).catch((e) => setError(errorMessage(e))); };
  useEffect(load, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (c: Conference) => {
    setItems((prev) => prev?.map((x) => (x.id === c.id ? { ...x, is_following: !c.is_following, follower_count: x.follower_count + (c.is_following ? -1 : 1) } : x)) || prev);
    try { if (c.is_following) await conferencesApi.unfollow(c.id); else await conferencesApi.follow(c.id); } catch (err) { toast({ title: 'Could not update', description: errorMessage(err), variant: 'destructive' }); load(); }
  };
  const remove = async (c: Conference) => {
    try { await conferencesApi.remove(c.id); setItems((prev) => prev?.filter((x) => x.id !== c.id) || prev); } catch (err) { toast({ title: 'Could not remove', description: errorMessage(err), variant: 'destructive' }); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="text-indigo-400" /> Conferences</h1>
          <p className="text-sm text-zinc-500">Upcoming conferences and submission deadlines, added by the community.</p>
        </div>
        <button className={primaryBtn} onClick={() => setAdding(true)}><Plus size={16} /> Add conference</button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--foreground)]/5">
          {(['all', 'following'] as const).map((s) => <button key={s} onClick={() => setScope(s)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${scope === s ? 'bg-[var(--background)] shadow' : 'text-zinc-500'}`}>{s === 'all' ? 'Upcoming' : 'Tracking'}</button>)}
        </div>
        <form className="relative flex-1 min-w-48" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input className={`${inputClass} pl-9`} placeholder="Search by name or field" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      </div>
      {error ? <ErrorState message={error} onRetry={load} /> : !items ? <Spinner /> : items.length === 0 ? (
        <EmptyState icon={<Calendar size={32} />} title={scope === 'following' ? 'You are not tracking any conferences' : 'No upcoming conferences'} description="Add the conferences you're targeting so others can track deadlines too." />
      ) : (
        <ul className="space-y-3">
          {items.map((c) => {
            const left = daysUntil(c.submission_deadline);
            return (
              <li key={c.id} className="rounded-2xl border border-[var(--border)] p-4 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="font-semibold">{c.acronym ? <span className="text-indigo-300 mr-2">{c.acronym}</span> : null}{c.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    {c.field && <span>{c.field}</span>}
                    {c.location && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {c.location}</span>}
                    {c.start_date && <span>{formatDate(c.start_date)}{c.end_date && c.end_date !== c.start_date ? ` – ${formatDate(c.end_date)}` : ''}</span>}
                    <span>{c.follower_count} tracking</span>
                  </div>
                  {c.description && <p className="text-sm text-zinc-400 line-clamp-2">{c.description}</p>}
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  {c.submission_deadline && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${left !== null && left < 0 ? 'bg-zinc-500/15 text-zinc-400' : left !== null && left <= 14 ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                      {left !== null && left < 0 ? 'Deadline passed' : left === 0 ? 'Deadline today' : `Deadline in ${left} day${left === 1 ? '' : 's'}`} · {formatDate(c.submission_deadline, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    {c.website_url && <a href={c.website_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-[var(--foreground)]/5" aria-label="Website"><ExternalLink size={16} /></a>}
                    <button onClick={() => toggle(c)} className={`${secondaryBtn} py-1.5`}>{c.is_following ? <><BellOff size={14} /> Untrack</> : <><Bell size={14} /> Track</>}</button>
                    {(c.created_by === user?.id || user?.role !== 'user') && <button onClick={() => remove(c)} className="p-2 text-zinc-500 hover:text-red-400" aria-label="Remove"><Trash2 size={15} /></button>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <AddConference open={adding} onClose={() => setAdding(false)} onAdded={(c) => setItems((prev) => [c, ...(prev || [])])} />
    </div>
  );
}
