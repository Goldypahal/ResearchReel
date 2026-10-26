"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, FileText, Loader2, Upload } from 'lucide-react';
import { documentsApi, errorMessage, type LibraryDocument } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

const ACCEPT = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_BYTES = 50 * 1024 * 1024;
const POLL_MS = 1500;

type Phase = 'pick' | 'uploading' | 'processing' | 'done' | 'failed';

const accepted = (f: File) => /\.(pdf|docx)$/i.test(f.name);

/**
 * Upload → extraction → result. Shared by the global "Upload paper" modal and
 * the Library page. Calls onUploaded once the paper is ready (or failed).
 */
export default function PaperUploader({ onUploaded, onCancel }: { onUploaded?: (doc: LibraryDocument) => void; onCancel?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [doi, setDoi] = useState('');
  const [phase, setPhase] = useState<Phase>('pick');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<LibraryDocument | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const choose = (f: File | undefined) => {
    if (!f) return;
    if (!accepted(f)) return setError('Only PDF and DOCX files are supported.');
    if (f.size > MAX_BYTES) return setError(`That file is ${formatBytes(f.size)} — the limit is 50 MB.`);
    setError(null);
    setFile(f);
  };

  // Poll until text extraction finishes.
  useEffect(() => {
    if (phase !== 'processing' || !doc) return;
    let stopped = false;
    const tick = async () => {
      try {
        const latest = await documentsApi.getDocument(doc.id);
        if (stopped) return;
        if (latest.status === 'ready' || latest.status === 'failed') {
          setDoc(latest);
          setPhase(latest.status === 'ready' ? 'done' : 'failed');
          onUploaded?.(latest);
          return;
        }
      } catch { /* transient; keep polling */ }
      if (!stopped) window.setTimeout(tick, POLL_MS);
    };
    const t = window.setTimeout(tick, POLL_MS);
    return () => { stopped = true; window.clearTimeout(t); };
  }, [phase, doc, onUploaded]);

  const upload = async () => {
    if (!file) return;
    setPhase('uploading');
    setError(null);
    setProgress(0);
    try {
      const created = await documentsApi.uploadWithProgress(file, { title: title.trim() || undefined, doi: doi.trim() || undefined }, setProgress);
      trackEvent('upload_document', { size: file.size, type: file.name.split('.').pop() });
      setDoc(created);
      setPhase('processing');
    } catch (err) {
      setError(errorMessage(err));
      setPhase('pick');
    }
  };

  if (phase === 'done' || phase === 'failed') {
    const ok = phase === 'done';
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-start gap-3">
          {ok ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={22} /> : <AlertCircle className="mt-0.5 shrink-0 text-red-400" size={22} />}
          <div className="min-w-0">
            <p className="font-semibold">{ok ? doc?.title : 'We could not read that file'}</p>
            <p className="text-xs text-muted-foreground">
              {ok
                ? [doc?.metadata?.pages ? `${doc.metadata.pages} pages` : null, doc?.doi ? `DOI ${doc.doi}` : null, 'saved to your library'].filter(Boolean).join(' · ')
                : doc?.metadata?.error || 'The file may be scanned, encrypted or damaged. It is still in your library.'}
            </p>
          </div>
        </div>
        {ok && doc?.abstract && <p className="line-clamp-5 rounded-xl bg-[var(--foreground)]/[0.03] p-3 text-xs leading-relaxed text-muted-foreground">{doc.abstract}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          {ok && doc && (
            <>
              <Link href={`/create?document=${doc.id}`} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--foreground)]/5">Share as post</Link>
              <Link href={`/reels/create?document=${doc.id}`} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--foreground)]/5">Make a reel</Link>
            </>
          )}
          {doc && <Link href={`/library/documents/${doc.id}`} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500">Open paper</Link>}
        </div>
      </div>
    );
  }

  const busy = phase === 'uploading' || phase === 'processing';
  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0]); }}
        className={`flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-[var(--border)] hover:border-indigo-500/50'} disabled:cursor-default`}
      >
        <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 p-3 text-indigo-500">{file ? <FileText size={26} /> : <Upload size={26} />}</span>
        <span className="text-sm font-semibold">{file ? file.name : 'Drop a PDF or DOCX here, or click to browse'}</span>
        <span className="text-xs text-muted-foreground">{file ? formatBytes(file.size) : 'Up to 50 MB. Your papers are private until you share them.'}</span>
        <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
      </button>

      {file && !busy && (
        <div className="grid gap-3 sm:grid-cols-2">
          <input aria-label="Title (optional)" placeholder="Title (optional — we'll read it from the file)" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-sm focus:border-indigo-500/60 focus:outline-none" />
          <input aria-label="DOI (optional)" placeholder="DOI (optional)" value={doi} onChange={(e) => setDoi(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-sm focus:border-indigo-500/60 focus:outline-none" />
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {busy && (
        <div className="space-y-2" aria-live="polite">
          <div className="flex items-center gap-2 text-xs text-indigo-400">
            <Loader2 size={14} className="animate-spin" />
            {phase === 'uploading' ? `Uploading… ${Math.round(progress * 100)}%` : 'Reading the paper — extracting title, abstract and DOI…'}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div className={`h-full rounded-full bg-indigo-500 transition-all ${phase === 'processing' ? 'animate-pulse' : ''}`} style={{ width: `${phase === 'processing' ? 100 : Math.max(3, progress * 100)}%` }} />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && <button type="button" onClick={onCancel} disabled={phase === 'uploading'} className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium hover:bg-[var(--foreground)]/5 disabled:opacity-50">{phase === 'processing' ? 'Close' : 'Cancel'}</button>}
        <button type="button" onClick={upload} disabled={!file || busy} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
          {busy && <Loader2 size={14} className="animate-spin" />} Upload
        </button>
      </div>
    </div>
  );
}
