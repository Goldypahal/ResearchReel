import React from 'react';
import type { Lecture } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Lecture times in the viewer's own locale and timezone. */
export const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function StatusPill({ status }: { status: Lecture['status'] }) {
  const map = {
    live: 'bg-red-500/15 text-red-400',
    upcoming: 'bg-amber-500/15 text-amber-500',
    ended: 'bg-zinc-500/15 text-muted-foreground',
    cancelled: 'bg-zinc-500/15 text-muted-foreground line-through',
  } as const;
  const label = { live: 'Live now', upcoming: 'Upcoming', ended: 'Ended', cancelled: 'Cancelled' }[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', map[status])}>
      {status === 'live' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />}
      {label}
    </span>
  );
}

