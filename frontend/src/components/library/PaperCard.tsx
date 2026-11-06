import React from 'react';
import Link from 'next/link';
import { FileText, Lock, Link2 } from 'lucide-react';
import type { Paper } from '@/lib/api';
import { timeAgo } from '@/lib/format';

export default function PaperCard({ paper, showUploader = true, actions }: { paper: Paper; showUploader?: boolean; actions?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] p-4 flex gap-4 hover:bg-[var(--foreground)]/[0.02] transition-colors">
      <div className="w-11 h-14 rounded-lg bg-red-500/10 text-red-300 flex items-center justify-center shrink-0">
        {paper.source === 'doi' ? <Link2 size={20} /> : <FileText size={22} />}
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/library/documents/${paper.id}`} className="font-semibold hover:underline line-clamp-2">{paper.title}</Link>
        <p className="text-xs text-zinc-500 mt-0.5 truncate">
          {paper.authors?.length ? paper.authors.slice(0, 4).join(', ') + (paper.authors.length > 4 ? ' et al.' : '') : null}
          {paper.journal ? ` · ${paper.journal}` : ''}{paper.publication_year ? ` · ${paper.publication_year}` : ''}
        </p>
        {paper.abstract && <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{paper.abstract}</p>}
        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-zinc-500">
          {paper.visibility === 'private' && <span className="inline-flex items-center gap-1 text-amber-300"><Lock size={11} /> Private</span>}
          {paper.tags?.slice(0, 4).map((t) => <span key={t} className="px-1.5 py-0.5 rounded bg-[var(--foreground)]/5">#{t}</span>)}
          {showUploader && paper.uploader_username && <span>Shared by <Link href={`/profile/${paper.uploader_username}`} className="hover:underline">@{paper.uploader_username}</Link></span>}
          <span>{timeAgo(paper.created_at)}</span>
        </div>
      </div>
      {actions}
    </div>
  );
}
