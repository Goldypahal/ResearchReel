"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bot, FileText } from 'lucide-react';
import PaperChat from '@/components/ai/PaperChat';
import { LoadingBlock } from '@/components/common/States';
import { documentsApi, type LibraryDocument } from '@/lib/api';

function AskInner() {
  const params = useSearchParams();
  const router = useRouter();
  const documentId = params.get('document') || '';
  const q = params.get('q') || undefined;
  const [docs, setDocs] = useState<LibraryDocument[] | null>(null);
  const [scopedTitle, setScopedTitle] = useState<string | null>(null);

  useEffect(() => { documentsApi.getUserAssets().then(setDocs).catch(() => setDocs([])); }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
    if (!documentId) { setScopedTitle(null); return; }
    const own = docs?.find((d) => d.id === documentId);
    if (own) { setScopedTitle(own.title); return; }
    documentsApi.getDocument(documentId).then((d) => setScopedTitle(d.title)).catch(() => setScopedTitle('a shared paper'));
  }, [documentId, docs]);

  const ready = (docs || []).filter((d) => d.status === 'ready' && d.has_text !== false);

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight"><Bot size={22} className="text-indigo-400" /> Ask AI</h1>
          <p className="text-xs text-muted-foreground">
            {documentId ? <>Answering from <span className="font-semibold text-[var(--foreground)]">{scopedTitle || '…'}</span>.</> : 'Answers draw on the papers in your library.'}
          </p>
        </div>
        <select
          aria-label="Choose which papers to ask about"
          value={documentId}
          onChange={(e) => router.replace(e.target.value ? `/ai/ask?document=${e.target.value}` : '/ai/ask')}
          className="max-w-[280px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs"
        >
          <option value="">All my papers</option>
          {documentId && !ready.some((d) => d.id === documentId) && <option value={documentId}>{scopedTitle || 'This paper'}</option>}
          {ready.map((d) => <option key={d.id} value={d.id}>{d.title.slice(0, 70)}</option>)}
        </select>
      </div>

      {docs && docs.length === 0 && !documentId ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
          <FileText className="text-indigo-400" />
          <p className="text-sm font-semibold">Upload a paper to start asking questions</p>
          <p className="max-w-sm text-xs text-muted-foreground">AI answers are grounded in your papers, so there needs to be at least one in your library.</p>
          <Link href="/library" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Go to library</Link>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-[var(--border)]">
          <PaperChat
            key={documentId || 'all'}
            documentId={documentId || undefined}
            initialQuestion={q}
            suggestions={documentId ? ['Summarise the key findings', 'What methods were used?', 'What are the limitations?'] : ['Which of my papers discuss evaluation methods?', 'Compare the main results across my papers']}
          />
        </div>
      )}
    </div>
  );
}

export default function AIAskPage() {
  return <Suspense fallback={<LoadingBlock />}><AskInner /></Suspense>;
}
