"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { documentsApi, errorMessage, type Paper, type AiPaperRef } from '@/lib/api';
import { Modal, Spinner, inputClass, primaryBtn, secondaryBtn } from '@/components/common';
import { RagBadge } from './RagBadge';

/**
 * Lets the user choose several papers (their own or public ones) for a question or a research tool.
 */
export function PaperPicker({
  open, onClose, selected, onConfirm, max = 10, title = 'Choose papers',
}: {
  open: boolean;
  onClose: () => void;
  selected: AiPaperRef[];
  onConfirm: (papers: AiPaperRef[]) => void;
  max?: number;
  title?: string;
}) {
  const [tab, setTab] = useState<'mine' | 'public'>('mine');
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<AiPaperRef[]>(selected);

  useEffect(() => { if (open) setPicked(selected); }, [open, selected]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await documentsApi.list({ scope: tab, q: query.trim() || undefined });
      setPapers(r.documents);
    } catch (err) { setError(errorMessage(err)); setPapers([]); }
    finally { setLoading(false); }
  }, [tab, query]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [open, load, query]);

  const toggle = (p: Paper) => {
    setPicked((cur) => {
      if (cur.some((x) => x.id === p.id)) return cur.filter((x) => x.id !== p.id);
      if (cur.length >= max) return cur;
      return [...cur, { id: p.id, title: p.title, rag_status: p.rag_status }];
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex rounded-xl border border-[var(--border)] p-0.5 text-sm shrink-0" role="tablist">
            {(['mine', 'public'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg ${tab === t ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-[var(--foreground)]'}`}>
                {t === 'mine' ? 'My library' : 'Public papers'}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, author, tag or DOI" aria-label="Search papers" className={`${inputClass} pl-9`} />
          </div>
        </div>

        <div className="min-h-[200px] max-h-[50vh] overflow-y-auto rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
          {loading ? <Spinner /> : error ? <p className="p-4 text-sm text-red-400">{error}</p> : papers.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500 text-center">{tab === 'mine' ? 'No papers in your library yet. Upload one from the Library page.' : 'No papers found.'}</p>
          ) : papers.map((p) => {
            const isPicked = picked.some((x) => x.id === p.id);
            const full = !isPicked && picked.length >= max;
            return (
              <button key={p.id} type="button" onClick={() => toggle(p)} disabled={full} aria-pressed={isPicked}
                className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-[var(--foreground)]/5 disabled:opacity-40 ${isPicked ? 'bg-indigo-500/[0.06]' : ''}`}>
                <span className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${isPicked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-[var(--border)]'}`}>
                  {isPicked && <Check size={13} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium line-clamp-2">{p.title}</span>
                  <span className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5 flex-wrap">
                    {p.authors?.length ? <span className="truncate max-w-[18rem]">{p.authors.slice(0, 3).join(', ')}{p.authors.length > 3 ? ' et al.' : ''}</span> : null}
                    {p.publication_year ? <span>{p.publication_year}</span> : null}
                    <RagBadge status={p.rag_status} />
                    {!p.file_url && <span>No PDF (full-text answers unavailable)</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">{picked.length} of {max} selected</p>
          <div className="flex gap-2">
            <button onClick={onClose} className={secondaryBtn}>Cancel</button>
            <button onClick={() => { onConfirm(picked); onClose(); }} className={primaryBtn}>Use {picked.length || 'no'} paper{picked.length === 1 ? '' : 's'}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
