"use client";

import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Lock } from 'lucide-react';
import { errorMessage, usersApi, type AchievementSummary } from '@/lib/api';
import { ErrorState, SkeletonRows } from '@/components/common/States';
import { cn, formatCount } from '@/lib/utils';

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { usersApi.getAchievements().then(setData).catch((err) => setError(errorMessage(err))); }, []);

  if (error) return <ErrorState className="mx-auto mt-16 max-w-md" message={error} />;

  const sorted = data ? [...data.achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.progress / b.target - a.progress / a.target) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"><Award size={22} className="text-amber-400" /> Achievements</h1>
          <p className="mt-1 text-sm text-muted-foreground">Milestones earned from your activity on ResearchReel. Progress updates as you go.</p>
        </div>
        {data && <p className="text-sm"><span className="text-2xl font-bold">{data.unlocked_count}</span> <span className="text-muted-foreground">of {data.total} unlocked</span></p>}
      </div>

      {!data ? <SkeletonRows rows={6} /> : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((a) => {
            const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
            return (
              <div key={a.id} className={cn('space-y-3 rounded-2xl border p-5', a.unlocked ? 'border-amber-500/30 bg-amber-500/[0.04]' : 'border-[var(--border)]')}>
                <div className="flex items-center justify-between">
                  <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', a.unlocked ? 'bg-amber-500/15 text-amber-400' : 'bg-[var(--foreground)]/5 text-muted-foreground')}>
                    {a.unlocked ? <CheckCircle2 size={20} /> : <Lock size={18} />}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">{formatCount(Math.min(a.progress, a.target))}/{formatCount(a.target)}</span>
                </div>
                <div>
                  <h2 className="font-bold">{a.title}</h2>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]" role="progressbar" aria-valuemin={0} aria-valuemax={a.target} aria-valuenow={Math.min(a.progress, a.target)} aria-label={a.title}>
                  <div className={cn('h-full rounded-full', a.unlocked ? 'bg-amber-400' : 'bg-indigo-500')} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
