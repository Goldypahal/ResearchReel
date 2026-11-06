"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Info } from 'lucide-react';
import { communityApi, errorMessage, type LeaderboardEntry } from '@/lib/api';
import { Avatar, Spinner, ErrorState, EmptyState, VerifiedBadge, inputClass } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import { compactNumber } from '@/lib/format';

const PERIODS = [['week', 'This week'], ['month', 'This month'], ['all', 'All time']] as const;

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [field, setField] = useState('');
  const [applied, setApplied] = useState('');
  const [data, setData] = useState<{ leaders: LeaderboardEntry[]; me: { score: number; rank: number | null } | null } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null); setError('');
    communityApi.leaderboard(period, applied || undefined).then(setData).catch((e) => setError(errorMessage(e)));
  }, [period, applied]);

  const medal = (rank: number) => (rank === 1 ? 'text-amber-300' : rank === 2 ? 'text-zinc-300' : rank === 3 ? 'text-orange-400' : 'text-zinc-500');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="text-amber-300" /> Leaderboard</h1>
        <p className="text-sm text-zinc-500 flex items-start gap-1.5 mt-1"><Info size={14} className="mt-0.5 shrink-0" /> Points for sharing (posts 5, reels 10, papers 15), new followers (3) and engagement from others (likes 1, comments 2).</p>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--foreground)]/5">
          {PERIODS.map(([id, label]) => <button key={id} onClick={() => setPeriod(id)} className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold ${period === id ? 'bg-[var(--background)] shadow' : 'text-zinc-500'}`}>{label}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setApplied(field.trim()); }} className="flex-1 min-w-40">
          <input className={inputClass} placeholder="Filter by research interest" value={field} onChange={(e) => setField(e.target.value)} />
        </form>
      </div>
      {data?.me && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 flex items-center gap-3">
          <Avatar src={user?.avatar_url} name={user?.full_name} size={40} />
          <div className="flex-1"><p className="font-semibold text-sm">You</p><p className="text-xs text-zinc-400">{data.me.rank ? `Rank #${data.me.rank}` : 'Not in the top 50 yet'}</p></div>
          <p className="text-xl font-bold">{compactNumber(data.me.score)} <span className="text-xs font-normal text-zinc-500">pts</span></p>
        </div>
      )}
      {error ? <ErrorState message={error} /> : !data ? <Spinner /> : data.leaders.length === 0 ? (
        <EmptyState icon={<Trophy size={32} />} title="No activity yet" description="Share posts, papers and reels to appear on the leaderboard." />
      ) : (
        <ol className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
          {data.leaders.map((e) => (
            <li key={e.id} className={`flex items-center gap-3 px-4 py-3 ${e.id === user?.id ? 'bg-indigo-500/5' : ''}`}>
              <span className={`w-8 text-center font-bold ${medal(e.rank)}`}>{e.rank}</span>
              <Link href={`/profile/${e.username}`}><Avatar src={e.avatar_url} name={e.full_name} size={38} /></Link>
              <Link href={`/profile/${e.username}`} className="flex-1 min-w-0">
                <p className="text-sm font-semibold flex items-center gap-1 truncate">{e.full_name} <VerifiedBadge status={e.verification_status} /></p>
                <p className="text-xs text-zinc-500 truncate">@{e.username}{e.institution ? ` · ${e.institution}` : ''}</p>
              </Link>
              <span className="font-bold">{compactNumber(e.score)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
