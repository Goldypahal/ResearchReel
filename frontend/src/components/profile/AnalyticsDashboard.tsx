"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Download, Minus, Table2, BarChart3 } from 'lucide-react';
import { errorMessage, usersApi, type ProfileAnalytics } from '@/lib/api';
import { ErrorState, LoadingBlock } from '@/components/common/States';
import { cn, formatCount } from '@/lib/utils';

const PERIODS = [7, 30, 90] as const;
type Period = typeof PERIODS[number];

const METRICS: { key: keyof ProfileAnalytics['metrics']; label: string }[] = [
  { key: 'post_views', label: 'Post views' },
  { key: 'reel_views', label: 'Reel views' },
  { key: 'reactions', label: 'Reactions received' },
  { key: 'comments', label: 'Comments received' },
  { key: 'new_followers', label: 'New followers' },
];

function Delta({ value, previous }: { value: number; previous: number }) {
  if (previous === 0 && value === 0) return <span className="text-xs text-muted-foreground">No activity yet</span>;
  if (previous === 0) return <span className="text-xs text-muted-foreground">New this period</span>;
  const pct = Math.round(((value - previous) / previous) * 100);
  const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', pct > 0 ? 'text-emerald-500' : pct < 0 ? 'text-red-400' : 'text-muted-foreground')}>
      <Icon size={13} aria-hidden /> {pct > 0 ? '+' : ''}{pct}% <span className="font-normal text-muted-foreground">vs previous period</span>
    </span>
  );
}

const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** Single-series daily bar chart with per-bar hover tooltip and a table fallback. */
function DailyBars({ title, series, unit, asTable }: { title: string; series: { date: string; count: number }[]; unit: string; asTable: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((d) => d.count));
  const total = series.reduce((n, d) => n + d.count, 0);
  const ticks = [0, Math.ceil(max / 2), max];

  return (
    <figure className="rounded-2xl border border-[var(--border)] p-5">
      <figcaption className="mb-4 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{formatCount(total)} total</span>
      </figcaption>
      {asTable ? (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1 font-medium">Date</th><th className="py-1 text-right font-medium">{unit}</th></tr></thead>
            <tbody>
              {series.map((d) => (
                <tr key={d.date} className="border-t border-[var(--border)]">
                  <td className="py-1.5">{shortDate(d.date)}</td>
                  <td className="py-1.5 text-right tabular-nums">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative flex gap-2">
          <div className="flex h-40 flex-col justify-between pb-5 text-right text-[10px] tabular-nums text-muted-foreground" aria-hidden>
            {[...ticks].reverse().map((t) => <span key={t}>{t}</span>)}
          </div>
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 pb-5" aria-hidden>
              <div className="flex h-full flex-col justify-between">
                {ticks.map((t) => <div key={t} className="border-t border-[var(--border)] opacity-60" />)}
              </div>
            </div>
            <div className="relative flex h-40 items-end pb-5" style={{ gap: series.length > 40 ? 1 : 2 }} onMouseLeave={() => setHover(null)}>
              {series.map((d, i) => (
                <div
                  key={d.date}
                  className="relative flex h-full flex-1 cursor-default items-end"
                  onMouseEnter={() => setHover(i)}
                  role="img"
                  aria-label={`${shortDate(d.date)}: ${d.count} ${unit.toLowerCase()}`}
                >
                  <div
                    className={cn('w-full rounded-t-[4px] bg-[#6366f1] transition-opacity', hover !== null && hover !== i && 'opacity-50')}
                    style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 2 : 0 }}
                  />
                </div>
              ))}
              {hover !== null && (
                <div
                  className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs shadow-lg"
                  style={{ left: `${((hover + 0.5) / series.length) * 100}%` }}
                >
                  <div className="text-muted-foreground">{shortDate(series[hover].date)}</div>
                  <div className="font-semibold">{series[hover].count} {unit.toLowerCase()}</div>
                </div>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-muted-foreground" aria-hidden>
              <span>{shortDate(series[0].date)}</span>
              <span>{shortDate(series[series.length - 1].date)}</span>
            </div>
          </div>
        </div>
      )}
    </figure>
  );
}

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>(30);
  const [data, setData] = useState<ProfileAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asTable, setAsTable] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setData(null);
    try {
      setData(await usersApi.getAnalytics(period));
    } catch (err) {
      setError(errorMessage(err, 'Could not load analytics.'));
    }
  }, [period]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [['date', 'views', 'new_followers'], ...data.views_series.map((d, i) => [d.date, d.count, data.follower_series[i]?.count ?? 0])];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `researchreel-analytics-${period}d.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-6" aria-label="Your analytics">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Your engagement</h2>
          <p className="text-xs text-muted-foreground">Only you can see this. Views are counted once per person every 6 hours.</p>
        </div>
        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label="Period" className="flex rounded-lg border border-[var(--border)] p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p}
                role="radio"
                aria-checked={period === p}
                onClick={() => setPeriod(p)}
                className={cn('rounded-md px-3 py-1 text-xs font-semibold', period === p ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-[var(--foreground)]')}
              >
                {p}d
              </button>
            ))}
          </div>
          <button onClick={() => setAsTable((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--foreground)]/5" aria-pressed={asTable}>
            {asTable ? <BarChart3 size={13} /> : <Table2 size={13} />} {asTable ? 'Chart' : 'Table'}
          </button>
          <button onClick={exportCsv} disabled={!data} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--foreground)]/5 disabled:opacity-50">
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data ? (
        <LoadingBlock label="Crunching your numbers…" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {METRICS.map((m) => (
              <div key={m.key} className="space-y-1 rounded-2xl border border-[var(--border)] p-4">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-semibold">{formatCount(data.metrics[m.key].value)}</p>
                <Delta value={data.metrics[m.key].value} previous={data.metrics[m.key].previous} />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Engagement rate: {data.engagement_rate === null ? 'not enough views yet' : `${data.engagement_rate}% (reactions + comments per view)`}
          </p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DailyBars title="Daily views" series={data.views_series} unit="Views" asTable={asTable} />
            <DailyBars title="New followers per day" series={data.follower_series} unit="Followers" asTable={asTable} />
          </div>

          <div className="rounded-2xl border border-[var(--border)] p-5">
            <h3 className="mb-3 text-sm font-semibold">Top posts in the last {period} days</h3>
            {data.top_posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">You haven&apos;t posted yet. <Link href="/create" className="text-indigo-400 hover:underline">Share something</Link> to start seeing reach.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Post</th>
                    <th className="pb-2 text-right font-medium">Views</th>
                    <th className="pb-2 text-right font-medium">Reactions</th>
                    <th className="pb-2 text-right font-medium">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_posts.map((p) => (
                    <tr key={p.id} className="border-t border-[var(--border)]">
                      <td className="max-w-0 py-2 pr-3"><Link href={`/post/${p.id}`} className="block truncate hover:text-indigo-400">{p.title}</Link></td>
                      <td className="py-2 text-right tabular-nums">{p.views}</td>
                      <td className="py-2 text-right tabular-nums">{p.reactions}</td>
                      <td className="py-2 text-right tabular-nums">{p.comments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </section>
  );
}
