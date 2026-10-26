"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Info, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { errorMessage, usersApi, type LeaderboardEntry } from '@/lib/api';
import { cn, displayName, formatCount } from '@/lib/utils';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/common/States';
import Avatar from '@/components/common/Avatar';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import FollowButton from '@/components/common/FollowButton';

const PERIODS = [
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All time' },
] as const;
type Period = typeof PERIODS[number]['key'];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const [field, setField] = useState('');
  const [appliedField, setAppliedField] = useState('');
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
    setRows(null);
    setError(null);
    usersApi.getLeaderboard(period, appliedField || undefined)
      .then((r) => { if (!cancelled) setRows(r); })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)); });
    return () => { cancelled = true; };
  }, [period, appliedField]);

  const me = rows?.find((r) => r.id === user?.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"><Trophy size={22} className="text-amber-400" /> Leaderboard</h1>
        <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info size={13} className="mt-0.5 shrink-0" />
          Score = posts ×5 + new followers ×4 + reactions received ×3 + comments received ×2, over the selected period. Only verified accounts are ranked.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-[var(--border)] p-0.5">
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)} aria-pressed={period === p.key} className={cn('rounded-md px-3 py-1.5 text-xs font-semibold', period === p.key ? 'bg-indigo-600 text-white' : 'text-muted-foreground')}>{p.label}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setAppliedField(field.trim()); }} className="flex gap-2">
          <input value={field} onChange={(e) => setField(e.target.value)} placeholder="Filter by field, e.g. genomics" aria-label="Filter by research field" className="rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-1.5 text-xs" />
          <button type="submit" className="rounded-lg border border-[var(--border)] px-3 text-xs font-semibold">Filter</button>
        </form>
      </div>

      {me && (
        <p className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-4 py-3 text-sm">You&apos;re <span className="font-bold">#{me.rank}</span> with {formatCount(me.score)} points.</p>
      )}

      {error ? <ErrorState message={error} /> : !rows ? <SkeletonRows rows={8} /> : rows.length === 0 ? (
        <EmptyState icon={<Trophy size={20} />} title="No activity yet" description={appliedField ? `No one in “${appliedField}” has scored in this period.` : 'Post, get reactions and gain followers to appear here.'} />
      ) : (
        <ol className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
          {rows.map((r) => (
            <li key={r.id} className={cn('flex items-center gap-3 px-4 py-3', r.id === user?.id && 'bg-indigo-500/[0.05]')}>
              <span className={cn('w-7 text-center text-sm font-bold tabular-nums', r.rank <= 3 ? 'text-amber-400' : 'text-muted-foreground')}>{r.rank}</span>
              <Link href={`/profile/${r.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar src={r.avatar_url} name={displayName(r)} size="sm" />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold">{displayName(r)} <VerifiedBadge status={r.verification_status} size={13} /></p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.posts} posts · {r.reactions} reactions · {r.comments} comments · +{r.new_followers} followers
                  </p>
                </div>
              </Link>
              <span className="text-sm font-bold tabular-nums">{formatCount(r.score)}</span>
              <FollowButton username={r.username} initialFollowing={r.is_following} size="sm" />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
