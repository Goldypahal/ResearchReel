import React from 'react';
import { CheckCircle2, Loader2, AlertTriangle, FileWarning } from 'lucide-react';
import type { RagStatus } from '@/lib/api';

const STYLES: Record<RagStatus, { label: string; className: string; icon: React.ReactNode; hint: string }> = {
  ready: { label: 'Searchable', className: 'bg-emerald-500/10 text-emerald-400', icon: <CheckCircle2 size={11} />, hint: 'Indexed for cited answers and research tools.' },
  pending: { label: 'Indexing…', className: 'bg-amber-500/10 text-amber-300', icon: <Loader2 size={11} className="animate-spin" />, hint: 'Being indexed; usually takes under a minute.' },
  indexing: { label: 'Indexing…', className: 'bg-amber-500/10 text-amber-300', icon: <Loader2 size={11} className="animate-spin" />, hint: 'Being indexed; usually takes under a minute.' },
  failed: { label: 'Index failed', className: 'bg-red-500/10 text-red-400', icon: <AlertTriangle size={11} />, hint: 'Indexing failed after several attempts.' },
  unsupported: { label: 'No text', className: 'bg-zinc-500/10 text-zinc-400', icon: <FileWarning size={11} />, hint: 'No readable text (the PDF may be scanned images).' },
};

export function RagBadge({ status, className = '' }: { status?: RagStatus | null; className?: string }) {
  if (!status) return null;
  const s = STYLES[status];
  if (!s) return null;
  return (
    <span title={s.hint} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${s.className} ${className}`}>
      {s.icon} {s.label}
    </span>
  );
}

export const ragHint = (status?: RagStatus | null) => (status ? STYLES[status]?.hint : undefined);
