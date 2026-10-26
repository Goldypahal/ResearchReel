"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, FileText, Film, Sparkles } from 'lucide-react';
import { aiApi, documentsApi, type LibraryDocument, type Recommendation } from '@/lib/api';
import { SkeletonRows } from '@/components/common/States';
import { displayName, timeAgo } from '@/lib/utils';

export default function AIResearchHub() {
  const [docs, setDocs] = useState<LibraryDocument[] | null>(null);
  const [recs, setRecs] = useState<Recommendation[] | null>(null);

  useEffect(() => {
    documentsApi.getUserAssets().then(setDocs).catch(() => setDocs([]));
    aiApi.getRecommendations(5).then(setRecs).catch(() => setRecs([]));
  }, []);

  const readable = (docs || []).filter((d) => d.status === 'ready');

  const entries = [
    { title: 'Ask across your library', description: 'Questions answered from the papers you have uploaded, with quoted sources.', icon: Bot, href: '/ai/ask' },
    { title: 'Read a paper with AI', description: 'Open any paper for a summary and a chat scoped to that paper.', icon: FileText, href: '/library' },
    { title: 'Turn a paper into a reel', description: 'Draft a 30–60 second explainer script from a paper, edit it, then render.', icon: Film, href: '/reels/create' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div className="space-y-2 py-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400"><Sparkles size={14} /> AI research tools</div>
        <h1 className="text-3xl font-extrabold tracking-tight">AI research</h1>
        <p className="max-w-xl text-sm text-muted-foreground">Everything here works from papers you upload, so answers point back to the text.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {entries.map((e) => (
          <Link key={e.title} href={e.href} className="group space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--foreground)]/[0.02] p-5 transition-all hover:border-indigo-500/40">
            <e.icon size={22} className="text-indigo-400" />
            <h2 className="flex items-center justify-between font-bold group-hover:text-indigo-400">{e.title} <ArrowRight size={16} className="opacity-0 transition-opacity group-hover:opacity-100" /></h2>
            <p className="text-xs leading-relaxed text-muted-foreground">{e.description}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-bold">Your papers</h2>
          {!docs ? <SkeletonRows rows={3} /> : readable.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-muted-foreground">
              No papers yet. <Link href="/library" className="text-indigo-400 hover:underline">Upload one</Link> to use the AI tools.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
              {readable.slice(0, 6).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{d.title}</p>
                    <p className="text-[11px] text-muted-foreground">{d.summary_text ? 'Summarised' : 'Not summarised yet'} · {timeAgo(d.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Link href={`/ai/ask?document=${d.id}`} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--foreground)]/5">Ask</Link>
                    <Link href={`/library/documents/${d.id}`} className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-semibold hover:bg-[var(--foreground)]/5">Open</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold">Recommended for you</h2>
          {!recs ? <SkeletonRows rows={3} /> : recs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-muted-foreground">
              Nothing to recommend yet. Recommendations come from papers other researchers share, matched to the interests on your profile.
            </p>
          ) : (
            <ul className="space-y-2">
              {recs.map((r) => (
                <li key={r.post_id}>
                  <Link href={`/post/${r.post_id}`} className="block rounded-xl border border-[var(--border)] p-3 hover:border-indigo-500/30">
                    <p className="text-[11px] text-indigo-400">{r.reason}</p>
                    <p className="text-sm font-semibold">{r.title}</p>
                    <p className="text-[11px] text-muted-foreground">Shared by {displayName(r)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
