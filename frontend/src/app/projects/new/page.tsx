"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock, Globe, Loader2 } from 'lucide-react';
import { projectsApi, errorMessage } from '@/lib/api';
import { inputClass, primaryBtn } from '@/components/common';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [field, setField] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const p = await projectsApi.create({ name: name.trim(), description: description.trim(), research_field: field.trim() || undefined, visibility });
      router.push(`/projects/${p.id}`);
    } catch (err) { setError(errorMessage(err)); setBusy(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link href="/projects" className="text-sm text-zinc-500 inline-flex items-center gap-1.5 hover:text-zinc-300"><ArrowLeft size={15} /> Projects</Link>
      <h1 className="text-2xl font-bold">New project</h1>
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1 text-sm"><span className="text-zinc-400">Name</span><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required autoFocus /></label>
        <label className="block space-y-1 text-sm"><span className="text-zinc-400">Description</span><textarea className={`${inputClass} min-h-24`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} /></label>
        <label className="block space-y-1 text-sm"><span className="text-zinc-400">Research field</span><input className={inputClass} value={field} onChange={(e) => setField(e.target.value)} placeholder="e.g. Computational biology" maxLength={120} /></label>
        <fieldset className="grid grid-cols-2 gap-3">
          {([['private', Lock, 'Private', 'Only members can see it'], ['public', Globe, 'Public', 'Listed as public on your profile']] as const).map(([v, Icon, label, desc]) => (
            <button type="button" key={v} onClick={() => setVisibility(v)} className={`text-left p-3 rounded-xl border ${visibility === v ? 'border-indigo-500 bg-indigo-500/5' : 'border-[var(--border)]'}`}>
              <p className="text-sm font-semibold flex items-center gap-1.5"><Icon size={14} /> {label}</p><p className="text-xs text-zinc-500 mt-1">{desc}</p>
            </button>
          ))}
        </fieldset>
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <button className={`${primaryBtn} w-full`} disabled={busy || !name.trim()}>{busy && <Loader2 size={16} className="animate-spin" />} Create project</button>
      </form>
    </div>
  );
}
