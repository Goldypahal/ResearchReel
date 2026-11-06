"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search as SearchIcon, Hash } from 'lucide-react';
import { searchApi, errorMessage, type SearchResults } from '@/lib/api';
import { Avatar, Spinner, ErrorState, EmptyState, VerifiedBadge, inputClass } from '@/components/common';
import FollowButton from '@/components/common/FollowButton';
import PostCard from '@/components/feed/PostCard';
import PaperCard from '@/components/library/PaperCard';
import { compactNumber } from '@/lib/format';

type Tab = 'all' | 'users' | 'posts' | 'papers' | 'reels';
const TABS: { id: Tab; label: string }[] = [{ id: 'all', label: 'Top' }, { id: 'users', label: 'People' }, { id: 'papers', label: 'Papers' }, { id: 'posts', label: 'Posts' }, { id: 'reels', label: 'Reels' }];

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get('q') || '';
  const tab = (params.get('type') as Tab) || 'all';
  const [input, setInput] = useState(q);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState('');
  const [trending, setTrending] = useState<{ tag: string; count: number }[]>([]);

  useEffect(() => { setInput(q); }, [q]);
  useEffect(() => { searchApi.trendingTags().then(setTrending).catch(() => {}); }, []);
  useEffect(() => {
    if (!q) { setResults(null); return; }
    setResults(null); setError('');
    searchApi.search(q, tab).then(setResults).catch((e) => setError(errorMessage(e)));
  }, [q, tab]);

  const go = (nextQ: string, nextTab: Tab = tab) => router.push(`/search?q=${encodeURIComponent(nextQ)}${nextTab !== 'all' ? `&type=${nextTab}` : ''}`);
  const empty = results && !results.users?.length && !results.posts?.length && !results.papers?.length && !results.reels?.length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) go(input.trim()); }} className="relative" role="search">
        <SearchIcon size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input autoFocus={!q} className={`${inputClass} pl-10 py-3 rounded-full`} placeholder="Search people, papers, posts, reels or #tags" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Search" />
      </form>

      {!q && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold">Trending topics</h2>
          {trending.length === 0 ? <p className="text-sm text-zinc-500">Nothing trending yet.</p> : (
            <div className="flex flex-wrap gap-2">
              {trending.map((t) => <button key={t.tag} onClick={() => go(`#${t.tag}`)} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10"><Hash size={13} />{t.tag} <span className="text-xs text-zinc-500">{t.count}</span></button>)}
            </div>
          )}
        </section>
      )}

      {q && (
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)]" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => go(q, t.id)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${tab === t.id ? 'border-indigo-500' : 'border-transparent text-zinc-500'}`}>{t.label}</button>
          ))}
        </div>
      )}

      {q && error && <ErrorState message={error} />}
      {q && !error && !results && <Spinner />}
      {empty && <EmptyState icon={<SearchIcon size={28} />} title={`No results for “${q}”`} description="Try different keywords or check the spelling." />}

      {results?.users && results.users.length > 0 && (
        <section className="space-y-2">
          {tab === 'all' && <h2 className="text-sm font-bold">People</h2>}
          <ul className="space-y-1">
            {results.users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--foreground)]/[0.03]">
                <Link href={`/profile/${u.username}`}><Avatar src={u.avatar_url} name={u.full_name} size={44} /></Link>
                <Link href={`/profile/${u.username}`} className="flex-1 min-w-0">
                  <p className="text-sm font-semibold flex items-center gap-1">{u.full_name} <VerifiedBadge status={u.verification_status} /></p>
                  <p className="text-xs text-zinc-500 truncate">@{u.username}{u.institution ? ` · ${u.institution}` : ''} · {compactNumber(u.followers_count)} followers</p>
                </Link>
                <FollowButton username={u.username} initial={Boolean(u.is_following)} size="sm" />
              </li>
            ))}
          </ul>
          {tab === 'all' && results.users.length >= 5 && <button onClick={() => go(q, 'users')} className="text-sm text-indigo-400">See all people</button>}
        </section>
      )}

      {results?.papers && results.papers.length > 0 && (
        <section className="space-y-2">
          {tab === 'all' && <h2 className="text-sm font-bold">Papers</h2>}
          <div className="space-y-3">{results.papers.map((p) => <PaperCard key={p.id} paper={p} />)}</div>
          {tab === 'all' && results.papers.length >= 5 && <button onClick={() => go(q, 'papers')} className="text-sm text-indigo-400">See all papers</button>}
        </section>
      )}

      {results?.reels && results.reels.length > 0 && (
        <section className="space-y-2">
          {tab === 'all' && <h2 className="text-sm font-bold">Reels</h2>}
          <div className="grid grid-cols-3 gap-1.5">
            {results.reels.map((r) => (
              <Link key={r.id} href={`/reels?id=${r.id}`} className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.thumbnail_url && <img src={r.thumbnail_url} alt={r.title} className="w-full h-full object-cover" />}
                <span className="absolute bottom-1 left-1.5 right-1.5 text-[11px] text-white font-semibold line-clamp-2 drop-shadow">{r.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results?.posts && results.posts.length > 0 && (
        <section className="space-y-3">
          {tab === 'all' && <h2 className="text-sm font-bold">Posts</h2>}
          {results.posts.map((p) => <PostCard key={p.id} post={p} />)}
          {tab === 'all' && results.posts.length >= 5 && <button onClick={() => go(q, 'posts')} className="text-sm text-indigo-400">See all posts</button>}
        </section>
      )}
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<Spinner />}><SearchInner /></Suspense>;
}
