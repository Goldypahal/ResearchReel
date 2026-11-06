"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Compass, Hash, TrendingUp, Users, FileText, Trophy, Calendar, BookOpen } from 'lucide-react';
import { communityApi, errorMessage } from '@/lib/api';
import { Avatar, Spinner, ErrorState, EmptyState, VerifiedBadge } from '@/components/common';
import FollowButton from '@/components/common/FollowButton';
import PaperCard from '@/components/library/PaperCard';
import { compactNumber } from '@/lib/format';

type Data = Awaited<ReturnType<typeof communityApi.discover>>;

export default function DiscoverPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const load = () => { setError(''); communityApi.discover().then(setData).catch((e) => setError(errorMessage(e))); };
  useEffect(load, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Compass className="text-indigo-400" /> Discover</h1>
          <p className="text-sm text-zinc-500">Trending papers, rising researchers and active topics.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/explore" className="px-3 py-1.5 rounded-full bg-[var(--foreground)]/5 inline-flex items-center gap-1.5"><TrendingUp size={14} /> Explore</Link>
          <Link href="/lectures" className="px-3 py-1.5 rounded-full bg-[var(--foreground)]/5 inline-flex items-center gap-1.5"><BookOpen size={14} /> Lectures</Link>
          <Link href="/explore/conference" className="px-3 py-1.5 rounded-full bg-[var(--foreground)]/5 inline-flex items-center gap-1.5"><Calendar size={14} /> Conferences</Link>
          <Link href="/leaderboard" className="px-3 py-1.5 rounded-full bg-[var(--foreground)]/5 inline-flex items-center gap-1.5"><Trophy size={14} /> Leaderboard</Link>
        </div>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : !data ? <Spinner /> : (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
          <section className="space-y-3 min-w-0">
            <h2 className="font-bold flex items-center gap-2"><FileText size={16} /> Trending papers</h2>
            {data.papers.length === 0 ? <EmptyState title="No papers shared yet" description="Upload a paper to get the library started." action={<Link href="/library" className="text-sm text-indigo-400 font-semibold">Go to library</Link>} /> : (
              <div className="space-y-3">{data.papers.map((p) => <PaperCard key={p.id} paper={p} />)}</div>
            )}
          </section>
          <aside className="space-y-6">
            <section className="rounded-2xl border border-[var(--border)] p-4">
              <h2 className="font-bold text-sm flex items-center gap-2 mb-3"><Hash size={15} /> Topics</h2>
              {data.tags.length === 0 ? <p className="text-sm text-zinc-500">No topics yet.</p> : (
                <div className="flex flex-wrap gap-1.5">
                  {data.tags.map((t) => <Link key={t.tag} href={`/search?q=${encodeURIComponent('#' + t.tag)}`} className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20">#{t.tag} <span className="text-zinc-500">{t.count}</span></Link>)}
                </div>
              )}
            </section>
            <section className="rounded-2xl border border-[var(--border)] p-4">
              <h2 className="font-bold text-sm flex items-center gap-2 mb-3"><Users size={15} /> Rising researchers</h2>
              {data.researchers.length === 0 ? <p className="text-sm text-zinc-500">No one to suggest yet.</p> : (
                <ul className="space-y-3">
                  {data.researchers.map((u) => (
                    <li key={u.id} className="flex items-center gap-3">
                      <Link href={`/profile/${u.username}`}><Avatar src={u.avatar_url} name={u.full_name} size={36} /></Link>
                      <Link href={`/profile/${u.username}`} className="flex-1 min-w-0">
                        <p className="text-sm font-semibold flex items-center gap-1 truncate">{u.full_name} <VerifiedBadge status={u.verification_status} /></p>
                        <p className="text-[11px] text-zinc-500 truncate">{compactNumber(u.followers_count)} followers{u.new_followers ? ` · +${u.new_followers} this month` : ''}</p>
                      </Link>
                      <FollowButton username={u.username} initial={Boolean(u.is_following)} size="sm" />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
