"use client";

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Bot, ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Film, Globe, Lock, Pencil,
  Share2, Sparkles, Trash2, ZoomIn, ZoomOut,
} from 'lucide-react';
import { aiApi, ApiError, documentsApi, errorMessage, type LibraryDocument } from '@/lib/api';
import { EmptyState, ErrorState, LoadingBlock, Spinner } from '@/components/common/States';
import PaperChat from '@/components/ai/PaperChat';
import { toast } from '@/components/ui/use-toast';
import { cn, formatBytes, timeAgo } from '@/lib/utils';

const PDFViewer = dynamic(() => import('@/components/document/PDFViewer'), { ssr: false, loading: () => <LoadingBlock label="Loading viewer…" /> });

function EditDetails({ doc, onSaved, onClose }: { doc: LibraryDocument; onSaved: (d: LibraryDocument) => void; onClose: () => void }) {
  const [title, setTitle] = useState(doc.title);
  const [doi, setDoi] = useState(doc.doi || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSaved(await documentsApi.update(doc.id, { title: title.trim(), doi: doi.trim() || null }));
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="space-y-3 rounded-xl border border-[var(--border)] p-4">
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
      <label className="block space-y-1 text-xs font-semibold">Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={500} className="w-full rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-sm font-normal" />
      </label>
      <label className="block space-y-1 text-xs font-semibold">DOI
        <input value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="10.1234/abcd" className="w-full rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-sm font-normal" />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold">Cancel</button>
        <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function DocumentReaderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<LibraryDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [panel, setPanel] = useState<'summary' | 'ask'>('summary');
  const [mobileView, setMobileView] = useState<'paper' | 'panel'>('paper');
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [summarizing, setSummarizing] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const d = await documentsApi.getDocument(id);
      setDoc(d);
      document.title = `${d.title} · ResearchReel`;
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) setNotFound(true);
      else setError(errorMessage(err));
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // While text extraction runs, refresh every couple of seconds.
  useEffect(() => {
    if (doc?.status !== 'processing') return;
    const t = window.setTimeout(load, 2000);
    return () => window.clearTimeout(t);
  }, [doc, load]);

  if (notFound) {
    return <EmptyState className="mx-auto mt-16 max-w-md" icon={<FileText size={20} />} title="Paper not found" description="It may have been deleted, or it's private to someone else." action={<Link href="/library" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Back to library</Link>} />;
  }
  if (error) return <ErrorState className="mx-auto mt-16 max-w-md" message={error} onRetry={load} />;
  if (!doc) return <LoadingBlock className="pt-32" />;

  const isOwner = doc.permission === 'owner';
  const isPdf = /pdf/i.test(doc.file_type || '') || /\.pdf$/i.test(doc.file_name);
  const summary = doc.summary_text;
  const keyPoints = Array.isArray(doc.key_points) ? doc.key_points : [];

  const summarize = async () => {
    setSummarizing(true);
    try {
      const res = await aiApi.summarizeDocument(doc.id);
      setDoc({ ...doc, summary_text: res.abstract, key_points: res.key_points });
    } catch (err) {
      const msg = err instanceof ApiError && err.code === 'AI_UNAVAILABLE' ? 'AI summaries are unavailable right now. Try again later.' : errorMessage(err);
      toast({ title: 'Could not summarise', description: msg, variant: 'destructive' });
    } finally {
      setSummarizing(false);
    }
  };

  const toggleVisibility = async () => {
    const next = doc.visibility === 'public' ? 'private' : 'public';
    try {
      const updated = await documentsApi.update(doc.id, { visibility: next });
      setDoc({ ...doc, ...updated });
      toast({ title: next === 'public' ? 'Anyone with the link can now read this paper' : 'Paper is private again', variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not change visibility', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${doc.title}" from your library? Posts that share it will no longer link to the file.`)) return;
    try {
      await documentsApi.deleteAsset(doc.id);
      toast({ title: 'Paper deleted', variant: 'success' });
      router.push('/library');
    } catch (err) {
      toast({ title: 'Could not delete', description: errorMessage(err), variant: 'destructive' });
    }
  };

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] flex-col md:-m-8">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => router.push('/library')} aria-label="Back to library" className="rounded-lg p-1.5 hover:bg-[var(--foreground)]/5"><ArrowLeft size={18} /></button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold">{doc.title}</h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {[doc.metadata?.pages ? `${doc.metadata.pages} pages` : null, formatBytes(doc.file_size), `added ${timeAgo(doc.created_at)}`].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {doc.doi && <a href={`https://doi.org/${doc.doi}`} target="_blank" rel="noreferrer" className="hidden items-center gap-1 rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--foreground)]/5 sm:inline-flex">DOI <ExternalLink size={12} /></a>}
          <a href={doc.file_url} download={doc.file_name} aria-label="Download" className="rounded-lg p-2 hover:bg-[var(--foreground)]/5"><Download size={16} /></a>
          {isOwner && (
            <>
              <button onClick={toggleVisibility} aria-label={doc.visibility === 'public' ? 'Make private' : 'Make public'} title={doc.visibility === 'public' ? 'Public — click to make private' : 'Private — click to make public'} className="rounded-lg p-2 hover:bg-[var(--foreground)]/5">
                {doc.visibility === 'public' ? <Globe size={16} className="text-emerald-500" /> : <Lock size={16} />}
              </button>
              <button onClick={remove} aria-label="Delete paper" className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"><Trash2 size={16} /></button>
            </>
          )}
        </div>
      </header>

      <div className="flex border-b border-[var(--border)] md:hidden">
        {(['paper', 'panel'] as const).map((v) => (
          <button key={v} onClick={() => setMobileView(v)} className={cn('flex-1 py-2.5 text-xs font-semibold', mobileView === v ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-muted-foreground')}>
            {v === 'paper' ? 'Paper' : 'Summary & AI'}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Paper */}
        <div className={cn('min-w-0 flex-1 flex-col bg-[var(--foreground)]/[0.03]', mobileView === 'paper' ? 'flex' : 'hidden md:flex')}>
          {doc.status === 'processing' ? (
            <LoadingBlock label="Reading the paper…" />
          ) : isPdf ? (
            <>
              <div className="flex items-center justify-center gap-2 border-b border-[var(--border)] py-2 text-xs">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page" className="rounded p-1 disabled:opacity-30"><ChevronLeft size={16} /></button>
                <span className="tabular-nums">{page} / {numPages || '…'}</span>
                <button onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={!numPages || page >= numPages} aria-label="Next page" className="rounded p-1 disabled:opacity-30"><ChevronRight size={16} /></button>
                <span className="mx-2 h-4 w-px bg-[var(--border)]" />
                <button onClick={() => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(1)))} aria-label="Zoom out" className="rounded p-1"><ZoomOut size={16} /></button>
                <span className="w-10 text-center tabular-nums">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale((s) => Math.min(2, +(s + 0.1).toFixed(1)))} aria-label="Zoom in" className="rounded p-1"><ZoomIn size={16} /></button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <PDFViewer url={doc.file_url} scale={scale} currentPage={page} onLoadSuccess={(n) => { setNumPages(n); setPage((p) => Math.min(p, n)); }} />
              </div>
            </>
          ) : (
            <EmptyState className="m-6" icon={<FileText size={20} />} title="Word document" description="DOCX files can't be previewed in the browser. The extracted text powers the summary and AI answers." action={<a href={doc.file_url} download={doc.file_name} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Download</a>} />
          )}
        </div>

        {/* Side panel */}
        <aside className={cn('w-full shrink-0 flex-col border-l border-[var(--border)] md:w-[400px]', mobileView === 'panel' ? 'flex' : 'hidden md:flex')}>
          <div className="flex border-b border-[var(--border)]">
            {([['summary', 'Summary', Sparkles], ['ask', 'Ask AI', Bot]] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setPanel(key)} className={cn('flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold', panel === key ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-muted-foreground')}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {panel === 'summary' ? (
            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              {editing && isOwner ? (
                <EditDetails doc={doc} onSaved={(d) => setDoc({ ...doc, ...d })} onClose={() => setEditing(false)} />
              ) : isOwner && (
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--foreground)]"><Pencil size={12} /> Edit title / DOI</button>
              )}

              {doc.status === 'failed' && (
                <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
                  We couldn&apos;t extract text from this file{doc.metadata?.error ? ` (${doc.metadata.error})` : ''}. It may be a scanned image. Summaries and AI answers need readable text.
                </p>
              )}

              <section className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI summary</h2>
                {summary ? (
                  <>
                    <p className="text-sm leading-relaxed">{summary}</p>
                    {keyPoints.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5 text-sm">{keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>
                    )}
                  </>
                ) : doc.has_text ? (
                  <button onClick={summarize} disabled={summarizing} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
                    {summarizing ? <Spinner size={14} className="text-white" /> : <Sparkles size={14} />} {summarizing ? 'Summarising…' : 'Generate summary'}
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground">Not available — no text was extracted.</p>
                )}
              </section>

              {doc.abstract && (
                <section className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Abstract (from the paper)</h2>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{doc.abstract}</p>
                </section>
              )}

              {isOwner && doc.status === 'ready' && (
                <section className="grid grid-cols-2 gap-2 pt-2">
                  <Link href={`/create?document=${doc.id}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-2 text-xs font-semibold hover:bg-[var(--foreground)]/5"><Share2 size={13} /> Share as post</Link>
                  <Link href={`/reels/create?document=${doc.id}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-2 text-xs font-semibold hover:bg-[var(--foreground)]/5"><Film size={13} /> Make a reel</Link>
                </section>
              )}
            </div>
          ) : doc.has_text ? (
            <div className="min-h-0 flex-1">
              <PaperChat
                documentId={doc.id}
                placeholder="Ask about methods, results, limitations…"
                suggestions={['What problem does this paper solve?', 'What are the main results?', 'What are the limitations?']}
              />
            </div>
          ) : (
            <p className="p-4 text-xs text-muted-foreground">AI answers need the paper&apos;s text, which couldn&apos;t be extracted from this file.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
