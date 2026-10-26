"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Hash, Search, TrendingUp, X } from 'lucide-react';
import Feed from '@/components/feed/Feed';
import PostCard from '@/components/feed/PostCard';
import { postsApi, type Post } from '@/lib/api';
import { LoadingBlock, SkeletonRows } from '@/components/common/States';
import { cn } from '@/lib/utils';

function ExploreInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tag = (params.get('tag') || '').replace(/^#/, '').toLowerCase();
  const [q, setQ] = useState('');
  const [tags, setTags] = useState<{ tag: string; post_count: number }[] | null>(null);
  const [trending, setTrending] = useState<Post[] | null>(null);

  useEffect(() => {
    postsApi.getTrendingTags().then(setTags).catch(() => setTags([]));
    postsApi.getTrending(7).then(setTrending).catch(() => setTrending([]));
  }, []);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    if (term.startsWith('#')) router.push(`/explore?tag=${encodeURIComponent(term.slice(1))}`);
    else router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 pb-24 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-6">
        <form onSubmit={search} className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search papers, people and posts — or #tag" aria-label="Search" className="w-full rounded-xl border border-[var(--border)] bg-[var(--foreground)]/5 py-3 pl-10 pr-4 text-sm focus:border-indigo-500/50 focus:outline-none" />
        </form>

        {tag ? (
          <>
            <div className="flex items-center justify-between">
              <h1 className="flex items-center gap-1 text-2xl font-extrabold"><Hash size={22} className="text-indigo-400" />{tag}</h1>
              <Link href="/explore" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[var(--foreground)]"><X size={14} /> Clear</Link>
            </div>
            <Feed tag={tag} />
          </>
        ) : (
          <>
            <h1 className="flex items-center gap-2 text-xl font-extrabold"><TrendingUp size={20} className="text-indigo-400" /> Trending this week</h1>
            {!trending ? <SkeletonRows rows={4} /> : trending.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-muted-foreground">Nothing is trending yet. Posts with the most reactions and comments this week show up here.</p>
            ) : (
              trending.map((p) => <PostCard key={p.id} post={p} />)
            )}
          </>
        )}
      </div>

      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <h2 className="text-sm font-bold">Popular topics</h2>
        {!tags ? <SkeletonRows rows={3} /> : tags.length === 0 ? (
          <p className="text-xs text-muted-foreground">Topics appear as people tag their posts.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Link key={t.tag} href={`/explore?tag=${encodeURIComponent(t.tag)}`} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold', t.tag === tag ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[var(--border)] hover:border-indigo-500/40')}>
                #{t.tag} <span className="font-normal text-muted-foreground">{t.post_count}</span>
              </Link>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

export default function ExplorePage() {
  return <Suspense fallback={<LoadingBlock />}><ExploreInner /></Suspense>;
}
