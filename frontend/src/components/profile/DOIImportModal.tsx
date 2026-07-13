"use client";

import React, { useState, useCallback } from 'react';
import {
  X, Search, Plus, Loader2, CheckCircle2, AlertCircle,
  BookOpen, ExternalLink, ChevronDown, ChevronUp, Trash2, Import
} from 'lucide-react';

export interface ImportedPaper {
  id: string;
  doi?: string | null;
  doi_url?: string | null;
  pdf_url?: string | null;
  landing_url?: string | null;
  title: string;
  abstract?: string;
  summary_text?: string;
  authors: { name: string; orcid?: string | null }[];
  primary_author: { name: string; orcid?: string | null };
  author_name: string;
  author_username: string;
  journal?: string;
  year?: number | null;
  cited_by_count?: number;
  tags: string[];
  content_type: 'document';
  caption: string;
  document_name?: string;
  reaction_count: number;
  verification_status: string;
  source: string;
}

interface DOIImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (papers: ImportedPaper[]) => void;
}

type InputMode = 'orcid' | 'doi_list';
type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function DOIImportModal({ isOpen, onClose, onImport }: DOIImportModalProps) {
  const [inputMode, setInputMode] = useState<InputMode>('orcid');
  const [orcidValue, setOrcidValue] = useState('');
  const [doiListValue, setDoiListValue] = useState('');

  const [status, setStatus] = useState<FetchStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [fetchedPapers, setFetchedPapers] = useState<ImportedPaper[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const reset = () => {
    setStatus('idle');
    setErrorMsg('');
    setFetchedPapers([]);
    setSelectedIds(new Set());
    setExpandedId(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // ─── Fetch by ORCID ───
  const fetchByORCID = useCallback(async () => {
    const clean = orcidValue.trim();
    if (!clean) {
      setErrorMsg('Please enter a valid ORCID.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/doi/author?orcid=${encodeURIComponent(clean)}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Fetch failed');
      const papers: ImportedPaper[] = json.data;
      setFetchedPapers(papers);
      setSelectedIds(new Set(papers.map((p: ImportedPaper) => p.id)));
      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }, [orcidValue]);

  // ─── Fetch by DOI list ───
  const fetchByDOIs = useCallback(async () => {
    const lines = doiListValue
      .split(/[\n,;]+/)
      .map(l => l.trim())
      .filter(Boolean);
    if (!lines.length) {
      setErrorMsg('Please enter at least one DOI.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/doi/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ dois: lines }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Batch import failed');
      const papers: ImportedPaper[] = json.data;
      setFetchedPapers(papers);
      setSelectedIds(new Set(papers.map((p: ImportedPaper) => p.id)));
      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }, [doiListValue]);

  const handleFetch = () => {
    if (inputMode === 'orcid') fetchByORCID();
    else fetchByDOIs();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(fetchedPapers.map(p => p.id)));
  const clearAll = () => setSelectedIds(new Set());

  const handleImport = () => {
    const selected = fetchedPapers.filter(p => selectedIds.has(p.id));
    if (!selected.length) return;
    onImport(selected);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999998] flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-2xl mx-4 bg-zinc-950 border border-zinc-800/70 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center">
              <Import size={17} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wide">Import Research Papers</h2>
              <p className="text-[10px] text-zinc-500 font-medium">Fetch papers via ORCID or DOI • Powered by Crossref</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        {/* ─── Mode Toggle ─── */}
        <div className="px-6 pt-5 pb-4 shrink-0">
          <div className="flex gap-2 bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-1">
            <button
              onClick={() => { setInputMode('orcid'); reset(); }}
              className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${
                inputMode === 'orcid'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              By ORCID
            </button>
            <button
              onClick={() => { setInputMode('doi_list'); reset(); }}
              className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all ${
                inputMode === 'doi_list'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              By DOI List
            </button>
          </div>
        </div>

        {/* ─── Input Area ─── */}
        <div className="px-6 pb-4 shrink-0">
          {inputMode === 'orcid' ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                ORCID iD
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={orcidValue}
                  onChange={e => setOrcidValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleFetch()}
                  placeholder="e.g. 0000-0001-2345-6789 or https://orcid.org/..."
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 text-sm px-4 py-2.5 rounded-xl outline-none focus:border-indigo-500/60 transition-colors font-mono"
                />
                <button
                  onClick={handleFetch}
                  disabled={status === 'loading'}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  {status === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                  <span>Fetch</span>
                </button>
              </div>
              <p className="text-[10px] text-zinc-600">
                Enter the researcher&apos;s ORCID to fetch all their published papers from Crossref.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                DOI List (one per line or comma-separated)
              </label>
              <textarea
                value={doiListValue}
                onChange={e => setDoiListValue(e.target.value)}
                placeholder={"10.1038/s41586-021-03491-6\n10.1126/science.abj8754\nhttps://doi.org/10.1007/..."}
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 text-sm px-4 py-3 rounded-xl outline-none focus:border-indigo-500/60 transition-colors resize-none font-mono"
              />
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-zinc-600">
                  Paste DOIs from papers you&apos;ve authored. Up to 20 at once.
                </p>
                <button
                  onClick={handleFetch}
                  disabled={status === 'loading'}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                >
                  {status === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>Import</span>
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-xs bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* ─── Results ─── */}
        {status === 'success' && fetchedPapers.length > 0 && (
          <div className="flex-1 flex flex-col overflow-hidden border-t border-zinc-800/50">
            {/* Results header */}
            <div className="flex items-center justify-between px-6 py-3 bg-zinc-900/30 shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-zinc-300">
                  Found <span className="text-white">{fetchedPapers.length}</span> papers
                  {' · '}<span className="text-indigo-400">{selectedIds.size} selected</span>
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                  Select All
                </button>
                <span className="text-zinc-700">|</span>
                <button onClick={clearAll} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors">
                  Clear
                </button>
              </div>
            </div>

            {/* Scrollable paper list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-zinc-800/30">
              {fetchedPapers.map(paper => {
                const isSelected = selectedIds.has(paper.id);
                const isExpanded = expandedId === paper.id;
                return (
                  <div
                    key={paper.id}
                    className={`px-6 py-4 transition-colors ${isSelected ? 'bg-indigo-500/5' : 'hover:bg-zinc-900/30'}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelect(paper.id)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'border-zinc-700 hover:border-indigo-500'
                        }`}
                      >
                        {isSelected && <CheckCircle2 size={12} className="text-white" />}
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-bold text-zinc-100 leading-snug">{paper.title}</p>
                        <p className="text-[10px] text-zinc-500">
                          {paper.authors?.slice(0, 3).map(a => a.name).join(', ')}
                          {paper.authors?.length > 3 && ` +${paper.authors.length - 3} more`}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {paper.journal && (
                            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/8 px-2 py-0.5 rounded">
                              {paper.journal}
                            </span>
                          )}
                          {paper.year && (
                            <span className="text-[9px] text-zinc-500 font-mono">{paper.year}</span>
                          )}
                          {typeof paper.cited_by_count === 'number' && (
                            <span className="text-[9px] text-zinc-600">{paper.cited_by_count} citations</span>
                          )}
                        </div>

                        {/* Expand / Collapse abstract */}
                        {paper.abstract && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : paper.id)}
                            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors mt-1"
                          >
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {isExpanded ? 'Hide abstract' : 'Show abstract'}
                          </button>
                        )}
                        {isExpanded && (
                          <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/50 p-3 rounded-lg mt-2 border border-zinc-800/40">
                            {paper.abstract}
                          </p>
                        )}
                      </div>

                      {/* DOI link */}
                      {paper.doi_url && (
                        <a
                          href={paper.doi_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-zinc-600 hover:text-indigo-400 transition-colors shrink-0"
                          title="View on publisher site"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setFetchedPapers(p => p.filter(x => x.id !== paper.id));
                          setSelectedIds(prev => { const n = new Set(prev); n.delete(paper.id); return n; });
                        }}
                        className="p-1.5 text-zinc-700 hover:text-red-400 transition-colors shrink-0"
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No results */}
        {status === 'success' && fetchedPapers.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
            <BookOpen size={36} className="text-zinc-700" />
            <p className="text-sm font-bold text-zinc-500">No papers found</p>
            <p className="text-xs text-zinc-600">Try a different ORCID or check the DOI format.</p>
          </div>
        )}

        {/* ─── Footer ─── */}
        {status === 'success' && fetchedPapers.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/60 bg-zinc-950 shrink-0">
            <p className="text-xs text-zinc-600">
              {selectedIds.size} paper{selectedIds.size !== 1 ? 's' : ''} will be posted to your profile feed
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors rounded-xl border border-zinc-800 hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selectedIds.size === 0}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
              >
                <BookOpen size={13} />
                Post {selectedIds.size} Paper{selectedIds.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
