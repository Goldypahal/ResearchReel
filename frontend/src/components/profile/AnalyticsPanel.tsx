"use client";

import React, { useEffect, useState } from 'react';
import { usersApi, errorMessage } from '@/lib/api';
import { Spinner, ErrorState } from '@/components/common';
import { compactNumber, formatDate } from '@/lib/format';

type Analytics = Awaited<ReturnType<typeof usersApi.analytics>>;

export default function AnalyticsPanel() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { usersApi.analytics().then(setData).catch((e) => setError(errorMessage(e))); }, []);
  if (error) return <ErrorState message={error} />;
  if (!data) return <Spinner />;
  const max = Math.max(1, ...data.follower_growth.map((d) => d.new_followers));
  const stats = [
    ['Followers', data.totals.followers], ['Views (30d)', data.totals.views_30d], ['Likes (30d)', data.totals.likes_30d],
    ['Comments (30d)', data.totals.comments_30d], ['Papers', data.totals.papers],
  ] as const;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(([label, v]) => (
          <div key={label} className="rounded-xl border border-[var(--border)] p-3"><p className="text-xl font-bold">{compactNumber(v)}</p><p className="text-xs text-zinc-500">{label}</p></div>
        ))}
        <div className="rounded-xl border border-[var(--border)] p-3"><p className="text-xl font-bold">{data.engagement_rate}</p><p className="text-xs text-zinc-500">Engagement (30d)</p></div>
      </div>
      <section className="rounded-2xl border border-[var(--border)] p-4">
        <h3 className="text-sm font-semibold mb-4">New followers, last 7 days</h3>
        <div className="flex items-end gap-2 h-32" role="img" aria-label="New followers per day">
          {data.follower_growth.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[10px] text-zinc-400">{d.new_followers || ''}</span>
              <div className="w-full rounded-t bg-indigo-500/80" style={{ height: `${(d.new_followers / max) * 100}%`, minHeight: d.new_followers ? 4 : 1 }} />
              <span className="text-[10px] text-zinc-500">{formatDate(d.day, { weekday: 'short' })}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-[var(--border)] p-4">
        <h3 className="text-sm font-semibold mb-3">Top content</h3>
        {data.top_content.length === 0 ? <p className="text-sm text-zinc-500">Publish posts and reels to see how they perform.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-zinc-500"><th className="font-medium pb-2">Content</th><th className="font-medium pb-2 text-right">Views</th><th className="font-medium pb-2 text-right">Interactions</th></tr></thead>
            <tbody>{data.top_content.map((c) => (
              <tr key={c.id} className="border-t border-[var(--border)]"><td className="py-2 pr-2 truncate max-w-xs">{c.title} <span className="text-xs text-zinc-500">· {c.type}</span></td><td className="py-2 text-right">{compactNumber(c.views)}</td><td className="py-2 text-right">{compactNumber(c.interactions)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </div>
  );
}
