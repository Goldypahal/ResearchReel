"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FlaskConical, Library, X, Loader2, Copy, Columns3, BookOpen, Search, GitCompareArrows, CalendarClock, Bot } from 'lucide-react';
import { aiApi, documentsApi, errorMessage, type AiPaperRef, type AiStatus, type ResearchResult, type ResearchTool } from '@/lib/api';
import Markdown from '@/components/common/Markdown';
import { Spinner, primaryBtn, secondaryBtn } from '@/components/common';
import { PaperPicker } from '@/components/ai/PaperPicker';
import { RagBadge } from '@/components/ai/RagBadge';
import { toast } from '@/components/ui/use-toast';

const TOOLS: { id: ResearchTool; title: string; description: string; min: number; icon: React.ElementType }[] = [
  { id: 'compare', title: 'Compare papers', description: 'A side-by-side table of methods, datasets and results.', min: 2, icon: Columns3 },
  { id: 'review', title: 'Literature review', description: 'A structured survey of the selected papers.', min: 1, icon: BookOpen },
  { id: 'gaps', title: 'Research gaps', description: 'Untested combinations and open questions.', min: 1, icon: Search },
  { id: 'contradictions', title: 'Contradictions', description: 'Where findings or claims disagree.', min: 2, icon: GitCompareArrows },
  { id: 'timeline', title: 'Timeline', description: 'How the ideas evolved, ordered by year.', min: 1, icon: CalendarClock },
];

function ResearchInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [papers, setPapers] = useState<AiPaperRef[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tool, setTool] = useState<ResearchTool>('compare');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { aiApi.status().then(setStatus).catch(() => setStatus(null)); }, []);

  useEffect(() => {
    const ids = (params.get('docs') || '').split(',').filter(Boolean).slice(0, 10);
    if (!ids.length) return;
    Promise.all(ids.map((id) => documentsApi.get(id).then((d) => ({ id: d.id, title: d.title, rag_status: d.rag_status })).catch(() => null)))
      .then((rows) => setPapers(rows.filter(Boolean) as AiPaperRef[]));
  }, [params]);

  const spec = TOOLS.find((t) => t.id === tool)!;
  const ready = papers.filter((p) => p.rag_status === 'ready');
  const notReady = papers.filter((p) => p.rag_status !== 'ready');
  const canRun = ready.length >= spec.min && !running;

  const run = async () => {
    if (!canRun) return;
    setRunning(true); setError(''); setResult(null);
    try { setResult(await aiApi.research(tool, papers.map((p) => p.id))); }
    catch (err) { setError(errorMessage(err)); }
    finally { setRunning(false); }
  };

  const copy = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.result); toast({ title: 'Copied as Markdown' }); }
    catch { toast({ title: 'Could not copy', variant: 'destructive' }); }
  };

  if (status && !status.paper_search) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-3">
        <FlaskConical className="mx-auto text-zinc-500" />
        <h1 className="text-xl font-bold">Research tools are not enabled</h1>
        <p className="text-sm text-zinc-500">This server has not connected the multi-paper search service yet. You can still ask questions about a single paper.</p>
        <Link href="/ai/ask" className={primaryBtn}><Bot size={15} /> Open the assistant</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical size={22} className="text-indigo-400" /> Research tools</h1>
        <p className="text-sm text-zinc-500 mt-1">Analyse several papers at once. Results are generated from the papers&apos; indexed text; check them against the papers.</p>
      </div>

      <section className="rounded-2xl border border-[var(--border)] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-sm">Papers ({papers.length})</h2>
          <button onClick={() => setPickerOpen(true)} className={secondaryBtn}><Library size={15} /> {papers.length ? 'Change papers' : 'Choose papers'}</button>
        </div>
        {papers.length === 0 ? <p className="text-sm text-zinc-500">No papers selected yet.</p> : (
          <ul className="flex flex-wrap gap-1.5">
            {papers.map((p) => (
              <li key={p.id} className="inline-flex items-center gap-1.5 text-xs pl-2.5 pr-1 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 max-w-full">
                <Link href={`/library/documents/${p.id}`} className="truncate max-w-[16rem] text-indigo-300 hover:underline">{p.title}</Link>
                <RagBadge status={p.rag_status} />
                <button onClick={() => setPapers((cur) => cur.filter((x) => x.id !== p.id))} aria-label={`Remove ${p.title}`} className="p-0.5 text-zinc-500 hover:text-[var(--foreground)]"><X size={12} /></button>
              </li>
            ))}
          </ul>
        )}
        {notReady.length > 0 && (
          <p className="text-xs text-amber-300">{notReady.length} selected paper{notReady.length > 1 ? 's are' : ' is'} not searchable yet and will be skipped. Papers without readable text or without a PDF cannot be analysed.</p>
        )}
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" role="radiogroup" aria-label="Research tool">
        {TOOLS.map((t) => (
          <button key={t.id} role="radio" aria-checked={tool === t.id} onClick={() => setTool(t.id)}
            className={`text-left rounded-2xl border p-4 transition-colors ${tool === t.id ? 'border-indigo-500/60 bg-indigo-500/[0.06]' : 'border-[var(--border)] hover:border-indigo-500/30'}`}>
            <p className="font-semibold text-sm flex items-center gap-2"><t.icon size={16} className="text-indigo-400" /> {t.title}</p>
            <p className="text-xs text-zinc-500 mt-1">{t.description}</p>
            <p className="text-[11px] text-zinc-600 mt-2">Needs {t.min}+ paper{t.min > 1 ? 's' : ''}</p>
          </button>
        ))}
      </section>

      <div className="flex items-center gap-3">
        <button onClick={run} disabled={!canRun} className={primaryBtn}>
          {running ? <Loader2 size={15} className="animate-spin" /> : <spec.icon size={15} />} {running ? 'Analysing… (this can take a minute)' : `Run ${spec.title.toLowerCase()}`}
        </button>
        {!running && ready.length < spec.min && <p className="text-xs text-zinc-500">Select at least {spec.min} searchable paper{spec.min > 1 ? 's' : ''}.</p>}
      </div>

      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

      {result && (
        <section className="rounded-2xl border border-[var(--border)] p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold">{result.title}</h2>
            <button onClick={copy} className="text-xs inline-flex items-center gap-1 text-zinc-400 hover:text-[var(--foreground)]"><Copy size={13} /> Copy</button>
          </div>
          <div className="overflow-x-auto"><Markdown text={result.result} /></div>
          <p className="text-xs text-zinc-500 border-t border-[var(--border)] pt-2">
            Based on: {result.papers.map((p, i) => <React.Fragment key={p.id}>{i > 0 && ', '}<Link href={`/library/documents/${p.id}`} className="text-indigo-400 hover:underline">{p.title}</Link></React.Fragment>)}
            {result.skipped.length > 0 && <> · Skipped (not indexed): {result.skipped.map((p) => p.title).join(', ')}</>}
          </p>
        </section>
      )}

      <PaperPicker open={pickerOpen} onClose={() => setPickerOpen(false)} selected={papers} onConfirm={(p) => { setPapers(p); setResult(null); }} max={status?.max_papers || 10} />
    </div>
  );
}

export default function ResearchPage() {
  return <Suspense fallback={<Spinner />}><ResearchInner /></Suspense>;
}
