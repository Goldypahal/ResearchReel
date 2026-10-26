"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, FileText, Globe, Lock, Search, Upload } from 'lucide-react';
import { documentsApi, errorMessage, type LibraryDocument } from '@/lib/api';
import UploadPaperModal from '@/components/ui/UploadPaperModal';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/common/States';
import { cn, formatBytes, timeAgo } from '@/lib/utils';

type Filter = 'all' | 'public' | 'private' | 'needs_attention';
type Sort = 'recent' | 'title';

const STATUS: Record<string, { label: string; className: string }> = {
  ready: { label: 'Ready', className: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  processing: { label: 'Processing', className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  failed: { label: 'No text', className: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

export default function LibraryPage() {
  const [docs, setDocs] = useState<LibraryDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('recent');

  const load = useCallback(async () => {
    setError(null);
    try { setDocs(await documentsApi.getUserAssets()); } catch (err) { setError(errorMessage(err)); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
  useEffect(() => { load(); }, [load]);

  // Keep processing papers fresh without a manual reload.
  useEffect(() => {
    if (!docs?.some((d) => d.status === 'processing')) return;
    const t = window.setTimeout(load, 2500);
    return () => window.clearTimeout(t);
  }, [docs, load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = (docs || []).filter((d) =>
      !q || d.title.toLowerCase().includes(q) || (d.abstract || '').toLowerCase().includes(q) || (d.doi || '').toLowerCase().includes(q));
    if (filter === 'public') list = list.filter((d) => d.visibility === 'public');
    if (filter === 'private') list = list.filter((d) => d.visibility !== 'public');
    if (filter === 'needs_attention') list = list.filter((d) => d.status !== 'ready');
    return [...list].sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : +new Date(b.created_at) - +new Date(a.created_at)));
  }, [docs, query, filter, sort]);

  const counts = useMemo(() => ({
    all: docs?.length || 0,
    public: docs?.filter((d) => d.visibility === 'public').length || 0,
    private: docs?.filter((d) => d.visibility !== 'public').length || 0,
    needs_attention: docs?.filter((d) => d.status !== 'ready').length || 0,
  }), [docs]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your papers. Private unless you share them or make them public.</p>
        </div>
        <div className="flex gap-2">
          {!!docs?.length && (
            <Link href="/ai/ask" className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:bg-[var(--foreground)]/5"><Bot size={16} /> Ask across library</Link>
          )}
          <button onClick={() => setUploadOpen(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500">
            <Upload size={16} /> Upload paper
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !docs ? (
        <SkeletonRows rows={4} />
      ) : docs.length === 0 ? (
        <EmptyState
          icon={<FileText size={20} />}
          title="No papers yet"
          description="Upload a PDF or DOCX. We extract the title, abstract and DOI, and you can ask AI about it or turn it into a reel."
          action={<button onClick={() => setUploadOpen(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Upload your first paper</button>}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-1">
              {([['all', 'All'], ['public', 'Public'], ['private', 'Private'], ['needs_attention', 'Needs attention']] as const).map(([key, label]) => (
                (key !== 'needs_attention' || counts.needs_attention > 0) && (
                  <button key={key} onClick={() => setFilter(key)} aria-pressed={filter === key} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold', filter === key ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-[var(--foreground)]/5')}>
                    {label} <span className="opacity-70">{counts[key]}</span>
                  </button>
                )
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 md:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your papers" aria-label="Search your papers" className="w-full rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 py-2 pl-8 pr-3 text-xs focus:border-indigo-500/50 focus:outline-none" />
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs">
                <option value="recent">Newest</option>
                <option value="title">Title A–Z</option>
              </select>
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No papers match.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shown.map((d) => {
                const st = STATUS[d.status] || STATUS.ready;
                return (
                  <Link key={d.id} href={`/library/documents/${d.id}`} className="group flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.02] p-4 transition-all hover:border-indigo-500/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', st.className)}>{st.label}</span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        {d.visibility === 'public' ? <><Globe size={11} /> Public</> : <><Lock size={11} /> Private</>}
                      </span>
                    </div>
                    <h3 className="line-clamp-2 text-sm font-bold group-hover:text-indigo-400">{d.title}</h3>
                    <p className="line-clamp-3 flex-1 text-xs text-muted-foreground">{d.summary_text || d.abstract || d.file_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {[d.metadata?.pages ? `${d.metadata.pages} pages` : null, formatBytes(d.file_size), timeAgo(d.created_at), d.summary_text ? 'AI summary' : null].filter(Boolean).join(' · ')}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      <UploadPaperModal isOpen={uploadOpen} onClose={() => { setUploadOpen(false); load(); }} onSuccess={() => load()} />
    </div>
  );
}
