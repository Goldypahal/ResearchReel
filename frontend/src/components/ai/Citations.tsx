"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, FileText } from 'lucide-react';
import type { AiSource } from '@/lib/api';

/** Numbered citations under an answer; passages expand on click. */
export function Citations({ sources }: { sources: AiSource[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const numbered = sources.filter((s) => s.number);
  const others = sources.filter((s) => !s.number);

  if (!numbered.length) {
    return (
      <div className="mt-2 pt-2 border-t border-[var(--border)] text-xs text-zinc-500 flex flex-wrap gap-x-2 gap-y-1">
        <span>{sources.length > 1 ? 'Sources:' : 'Source:'}</span>
        {sources.map((s, i) => (
          <Link key={`${s.documentId}-${i}`} href={`/library/documents/${s.documentId}`} className="text-indigo-400 hover:underline">{s.title}</Link>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 pt-2 border-t border-[var(--border)] space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Sources</p>
      <ol className="space-y-1">
        {numbered.map((s, i) => {
          const expanded = open === i;
          return (
            <li key={`${s.documentId}-${s.number}`} className="text-xs">
              <button type="button" onClick={() => setOpen(expanded ? null : i)} aria-expanded={expanded}
                className="w-full text-left flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--foreground)]/5">
                <span className="font-mono text-indigo-400 shrink-0">[{s.number}]</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-[var(--foreground)]">{s.title}</span>
                  <span className="text-zinc-500">
                    {s.page ? ` · p. ${s.page}` : ''}{s.section ? ` · ${s.section}` : ''}
                  </span>
                </span>
                {s.quote && <ChevronDown size={14} className={`shrink-0 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />}
              </button>
              {expanded && s.quote && (
                <div className="ml-8 mr-2 mb-1 pl-3 border-l-2 border-indigo-500/40 text-zinc-400 space-y-1">
                  <p className="italic leading-relaxed">“{s.quote.trim()}”</p>
                  <Link href={`/library/documents/${s.documentId}`} className="inline-flex items-center gap-1 text-indigo-400 hover:underline"><FileText size={11} /> Open paper</Link>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {others.length > 0 && (
        <p className="text-[11px] text-zinc-500 px-2">Also searched: {others.map((s) => s.title).join(', ')}</p>
      )}
    </div>
  );
}
