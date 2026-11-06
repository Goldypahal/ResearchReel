"use client";

import React, { useState } from 'react';
import { Loader2, Search, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Modal, inputClass, primaryBtn, secondaryBtn } from '@/components/common';
import { doiApi, errorMessage, type CrossrefPaper } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/use-toast';

/**
 * Finds publications on Crossref by ORCID iD or a list of DOIs and adds the
 * selected ones to the user's profile/library.
 */
export default function DOIImportModal({ isOpen, onClose, onImported }: { isOpen: boolean; onClose: () => void; onImported?: () => void }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'orcid' | 'doi'>(user?.orcid_id ? 'orcid' : 'doi');
  const [orcid, setOrcid] = useState(user?.orcid_id || '');
  const [doiText, setDoiText] = useState('');
  const [results, setResults] = useState<CrossrefPaper[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => { setResults(null); setSelected(new Set()); setError(''); onClose(); };

  const find = async () => {
    setBusy(true); setError(''); setResults(null);
    try {
      let papers: CrossrefPaper[];
      if (mode === 'orcid') papers = await doiApi.byOrcid(orcid.trim());
      else {
        const dois = doiText.split(/[\s,;]+/).map((d) => d.trim()).filter(Boolean).slice(0, 50);
        if (!dois.length) throw new Error('Paste at least one DOI.');
        const settled = await Promise.allSettled(dois.map((d) => doiApi.lookup(d)));
        papers = settled.filter((s): s is PromiseFulfilledResult<CrossrefPaper> => s.status === 'fulfilled').map((s) => s.value);
        const failed = settled.length - papers.length;
        if (failed) setError(`${failed} DOI${failed > 1 ? 's were' : ' was'} not found.`);
      }
      setResults(papers);
      setSelected(new Set(papers.map((p) => p.doi!).filter(Boolean)));
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  const importSelected = async () => {
    setBusy(true);
    try {
      const r = await doiApi.import([...selected]);
      const added = r.imported.filter((p) => !p.already_imported).length;
      toast({ title: added ? `${added} paper${added > 1 ? 's' : ''} added to your profile` : 'Those papers are already on your profile', variant: 'success' });
      onImported?.();
      close();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  const toggle = (doi: string) => setSelected((s) => { const n = new Set(s); if (n.has(doi)) n.delete(doi); else n.add(doi); return n; });

  return (
    <Modal open={isOpen} onClose={close} title="Import publications" wide>
      <div className="p-5 space-y-4">
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--foreground)]/5 w-fit">
          {(['orcid', 'doi'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setResults(null); }} className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${mode === m ? 'bg-[var(--background)] shadow' : 'text-zinc-500'}`}>
              {m === 'orcid' ? 'By ORCID iD' : 'By DOI'}
            </button>
          ))}
        </div>
        {mode === 'orcid' ? (
          <input className={inputClass} placeholder="0000-0002-1825-0097" value={orcid} onChange={(e) => setOrcid(e.target.value)} />
        ) : (
          <textarea className={`${inputClass} min-h-24 font-mono text-xs`} placeholder={'10.1038/nature12373\n10.1126/science.1259855'} value={doiText} onChange={(e) => setDoiText(e.target.value)} />
        )}
        <button className={secondaryBtn} onClick={find} disabled={busy || (mode === 'orcid' ? !orcid.trim() : !doiText.trim())}>
          {busy && !results ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Find papers
        </button>
        {error && <p className="text-sm text-amber-300">{error}</p>}
        {results && (results.length === 0 ? <p className="text-sm text-zinc-500">No publications found.</p> : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {results.map((p) => p.doi && (
              <li key={p.doi}>
                <label className="flex gap-3 p-3 rounded-xl border border-[var(--border)] cursor-pointer hover:bg-[var(--foreground)]/[0.02]">
                  <input type="checkbox" className="mt-1 accent-indigo-500" checked={selected.has(p.doi)} onChange={() => toggle(p.doi!)} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold line-clamp-2">{p.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{p.authors.map((a) => a.name).slice(0, 4).join(', ')}{p.journal ? ` · ${p.journal}` : ''}{p.year ? ` · ${p.year}` : ''}</p>
                    <a href={p.doi_url || '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}><ExternalLink size={11} /> {p.doi}</a>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        ))}
        {results && results.length > 0 && (
          <div className="flex justify-end">
            <button className={primaryBtn} onClick={importSelected} disabled={busy || selected.size === 0}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Add {selected.size} to my profile
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
