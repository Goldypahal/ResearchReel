"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, PlaySquare } from 'lucide-react';
import { postsApi, reelsApi, errorMessage, type Post, type Reel } from '@/lib/api';
import { Spinner, EmptyState, ErrorState } from '@/components/common';
import PostCard from '@/components/feed/PostCard';

export default function SavedPage() {
  const [tab, setTab] = useState<'posts' | 'reels'>('posts');
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [reels, setReels] = useState<Reel[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    if (tab === 'posts') postsApi.saved().then((r) => setPosts(r.posts)).catch((e) => setError(errorMessage(e)));
    else reelsApi.saved().then(setReels).catch((e) => setError(errorMessage(e)));
  }, [tab]);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Bookmark /> Saved</h1>
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--foreground)]/5 w-fit" role="tablist">
        {(['posts', 'reels'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize ${tab === t ? 'bg-[var(--background)] shadow' : 'text-zinc-500'}`}>{t}</button>
        ))}
      </div>
      {error && <ErrorState message={error} />}
      {!error && tab === 'posts' && (posts === null ? <Spinner /> : posts.length === 0 ? <EmptyState icon={<Bookmark size={28} />} title="No saved posts" description="Tap the bookmark on any post to save it for later." /> : (
        <div className="space-y-5">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
      ))}
      {!error && tab === 'reels' && (reels === null ? <Spinner /> : reels.length === 0 ? <EmptyState icon={<PlaySquare size={28} />} title="No saved reels" /> : (
        <div className="grid grid-cols-3 gap-1.5">
          {reels.map((r) => (
            <Link key={r.id} href={`/reels?id=${r.id}`} className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.thumbnail_url && <img src={r.thumbnail_url} alt={r.title} className="w-full h-full object-cover" />}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
