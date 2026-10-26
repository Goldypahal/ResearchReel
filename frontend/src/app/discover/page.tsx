"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Search, Sparkles, Users } from 'lucide-react';
import { aiApi, errorMessage, usersApi, type Recommendation, type UserCard } from '@/lib/api';
import UserRow from '@/components/common/UserRow';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/common/States';
import { cn, displayName } from '@/lib/utils';

export default function DiscoverPage() {
  const [tab, setTab] = useState<'people' | 'papers'>('people');
  const [q, setQ] = useState('');
  const [suggested, setSuggested] = useState<UserCard[] | null>(null);
  const [results, setResults] = useState<UserCard[] | null>(null);
  const [papers, setPapers] = useState<Recommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersApi.getSuggestions(20).then(setSuggested).catch((err) => setError(errorMessage(err)));
    aiApi.getRecommendations(20).then(setPapers).catch(() => setPapers([]));
  }, []);

  useEffect(() => {
    const term = q.trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
    if (term.length < 2) { setResults(null); return; }
    const t = window.setTimeout(() => usersApi.search(term, 20).then(setResults).catch(() => setResults([])), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const people = results ?? suggested;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Discover</h1>
        <p className="mt-1 text-sm text-muted-foreground">Find researchers to follow and papers people are sharing.</p>
      </div>

      <div role="tablist" className="flex gap-1 rounded-xl border border-[var(--border)] p-1">
        {([['people', 'Researchers', Users], ['papers', 'Shared papers', FileText]] as const).map(([key, label, Icon]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold', tab === key ? 'bg-indigo-600 text-white' : 'text-muted-foreground')}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'people' ? (
        <section className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, username or institution" aria-label="Search researchers" className="w-full rounded-xl border border-[var(--border)] bg-[var(--foreground)]/5 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500/50 focus:outline-none" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{results ? 'Results' : 'Suggested for you'}</h2>
          {error && !people ? <ErrorState message={error} /> : !people ? <SkeletonRows rows={6} /> : people.length === 0 ? (
            <EmptyState
              icon={<Users size={20} />}
              title={results ? 'No researchers found' : 'No suggestions yet'}
              description={results ? 'Try a different name or institution.' : 'Add research interests to your profile and we\'ll suggest people who share them.'}
              action={!results ? <Link href="/settings" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Edit interests</Link> : undefined}
            />
          ) : (
            <div className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] px-4">
              {people.map((u) => <UserRow key={u.id} user={u} />)}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          {!papers ? <SkeletonRows rows={4} /> : papers.length === 0 ? (
            <EmptyState icon={<Sparkles size={20} />} title="No shared papers yet" description="When researchers share papers in posts, the ones closest to your interests show up here." />
          ) : (
            papers.map((p) => (
              <Link key={p.post_id} href={`/post/${p.post_id}`} className="block space-y-2 rounded-2xl border border-[var(--border)] p-5 transition-colors hover:border-indigo-500/40">
                <p className="text-[11px] font-medium text-indigo-400">{p.reason}</p>
                <h3 className="font-bold leading-snug">{p.title}</h3>
                {p.abstract && <p className="line-clamp-3 text-sm text-muted-foreground">{p.abstract}</p>}
                <p className="text-xs text-muted-foreground">
                  Shared by {displayName(p)}{p.institution ? ` · ${p.institution}` : ''}{p.publication_year ? ` · ${p.publication_year}` : ''}{p.doi ? ` · doi:${p.doi}` : ''}
                </p>
              </Link>
            ))
          )}
        </section>
      )}
    </div>
  );
}
