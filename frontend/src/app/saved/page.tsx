"use client";

import React, { useCallback } from 'react';
import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import PostCard from '@/components/feed/PostCard';
import { postsApi, type Post } from '@/lib/api';
import { useCursorList, useInfiniteSentinel } from '@/lib/useCursorList';
import { EmptyState, ErrorState, LoadingBlock, Spinner } from '@/components/common/States';

export default function SavedPage() {
  const fetcher = useCallback((cursor: string | null) => postsApi.getSaved(cursor), []);
  const { items, initialLoading, loading, error, hasMore, loadMore, reload, remove } = useCursorList<Post>(fetcher);
  const sentinel = useInfiniteSentinel(loadMore);

  return (
    <div className="mx-auto max-w-[640px] space-y-6 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"><Bookmark size={22} className="text-indigo-400" /> Saved</h1>
        <p className="mt-1 text-sm text-muted-foreground">Posts you&apos;ve bookmarked. Only you can see this list.</p>
      </div>
      {initialLoading ? <LoadingBlock /> : error && items.length === 0 ? <ErrorState message={error} onRetry={reload} /> : items.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={20} />}
          title="Nothing saved yet"
          description="Tap the bookmark on any post to keep it here for later."
          action={<Link href="/explore" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Explore posts</Link>}
        />
      ) : (
        <>
          {items.map((p) => <PostCard key={p.id} post={p} onUnsaved={remove} onDeleted={remove} />)}
          <div ref={sentinel} />
          {loading && <div className="flex justify-center py-6"><Spinner /></div>}
          {!hasMore && items.length > 3 && <p className="py-6 text-center text-xs text-muted-foreground">That&apos;s everything you&apos;ve saved.</p>}
        </>
      )}
    </div>
  );
}
