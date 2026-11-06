"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Upload, Search, BookOpen, Link2 } from 'lucide-react';
import UploadPaperModal from '@/components/ui/UploadPaperModal';
import DOIImportModal from '@/components/profile/DOIImportModal';
import PaperCard from '@/components/library/PaperCard';
import { Spinner, ErrorState, EmptyState, LoadMore, inputClass, primaryBtn, secondaryBtn } from '@/components/common';
import { documentsApi, errorMessage, type Paper } from '@/lib/api';

export default function LibraryPage() {
  const [tab, setTab] = useState<'mine' | 'public'>('mine');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [docs, setDocs] = useState<Paper[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [doiOpen, setDoiOpen] = useState(false);

  const load = useCallback(async () => {
    setDocs(null); setError('');
    try {
      const r = await documentsApi.list({ scope: tab, q: query || undefined });
      setDocs(r.documents); setCursor(r.nextCursor);
    } catch (err) { setError(errorMessage(err)); }
  }, [tab, query]);
  useEffect(() => { load(); }, [load]);

  const more = useCallback(async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const r = await documentsApi.list({ scope: tab, q: query || undefined, cursor });
      setDocs((prev) => [...(prev || []), ...r.documents]); setCursor(r.nextCursor);
    } catch { /* retry */ } finally { setLoadingMore(false); }
  }, [cursor, tab, query]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="text-indigo-400" /> Library</h1>
          <p className="text-sm text-zinc-500">Your papers and research shared by the community.</p>
        </div>
        <div className="flex gap-2">
          <button className={secondaryBtn} onClick={() => setDoiOpen(true)}><Link2 size={15} /> Import by DOI</button>
          <button className={primaryBtn} onClick={() => setUploadOpen(true)}><Upload size={15} /> Upload PDF</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--foreground)]/5" role="tablist">
          {(['mine', 'public'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${tab === t ? 'bg-[var(--background)] shadow' : 'text-zinc-500'}`}>
              {t === 'mine' ? 'My papers' : 'Community'}
            </button>
          ))}
        </div>
        <form className="flex-1 min-w-48 relative" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input className={`${inputClass} pl-9`} placeholder="Search title, author, DOI or tag" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : docs === null ? <Spinner /> : docs.length === 0 ? (
        <EmptyState icon={<BookOpen size={32} />} title={query ? 'No matching papers' : tab === 'mine' ? 'Your library is empty' : 'No papers shared yet'}
          description={tab === 'mine' && !query ? 'Upload a PDF or import your publications by DOI.' : undefined} />
      ) : (
        <div className="space-y-3">
          {docs.map((d) => <PaperCard key={d.id} paper={d} showUploader={tab === 'public'} />)}
          <LoadMore onVisible={more} loading={loadingMore} hasMore={Boolean(cursor)} />
        </div>
      )}

      <UploadPaperModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={() => { setTab('mine'); load(); }} />
      <DOIImportModal isOpen={doiOpen} onClose={() => setDoiOpen(false)} onImported={() => { setTab('mine'); load(); }} />
    </div>
  );
}
