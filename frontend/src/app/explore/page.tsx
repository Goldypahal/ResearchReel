"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Play, FileText, TrendingUp } from 'lucide-react';
import { communityApi, errorMessage, type ExploreItem } from '@/lib/api';
import { Spinner, ErrorState, EmptyState } from '@/components/common';
import { compactNumber } from '@/lib/format';

export default function ExplorePage() {
  const [items, setItems] = useState<ExploreItem[] | null>(null);
  const [error, setError] = useState('');
  const load = () => { setError(''); communityApi.explore().then(setItems).catch((e) => setError(errorMessage(e))); };
  useEffect(load, []);

  return (
    <div className="max-w-[935px] mx-auto space-y-5">
      <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="text-indigo-400" /> Explore</h1>
      {error ? <ErrorState message={error} onRetry={load} /> : !items ? <Spinner /> : items.length === 0 ? (
        <EmptyState title="Nothing to explore yet" description="Posts with images, papers and reels will appear here as the community grows." />
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-3 auto-rows-[1fr]">
          {items.map((item) => {
            if (item.type === 'reel') {
              return (
                <Link key={`r-${item.id}`} href={`/reels?id=${item.id}`} className="relative row-span-2 bg-black rounded-md overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.thumbnail_url && <img src={item.thumbnail_url} alt={item.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                  <Play size={18} className="absolute top-2 right-2 text-white fill-white drop-shadow" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 text-white text-sm font-bold">
                    <span className="flex items-center gap-1"><Heart size={16} className="fill-white" /> {compactNumber(item.like_count)}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={16} className="fill-white" /> {compactNumber(item.comment_count)}</span>
                  </div>
                </Link>
              );
            }
            const img = item.media_urls?.[0];
            return (
              <Link key={`p-${item.id}`} href={`/post/${item.id}`} className="relative aspect-square bg-[var(--foreground)]/5 rounded-md overflow-hidden group">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={item.caption?.slice(0, 80) || 'Post image'} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="absolute inset-0 p-3 flex flex-col gap-2 bg-gradient-to-br from-indigo-950 to-zinc-900">
                    <FileText size={18} className="text-red-300" />
                    <p className="text-xs font-semibold line-clamp-4">{item.document_title || item.caption}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 text-white text-sm font-bold">
                  <span className="flex items-center gap-1"><Heart size={16} className="fill-white" /> {compactNumber(item.like_count)}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={16} className="fill-white" /> {compactNumber(item.comment_count)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
