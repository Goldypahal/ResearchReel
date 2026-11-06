"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Newspaper } from 'lucide-react';
import { postsApi, errorMessage, type Post } from '@/lib/api';
import { Spinner, ErrorState, EmptyState, LoadMore } from '@/components/common';
import PostCard from './PostCard';

export default function Feed({ scope = 'all', author, tag, emptyTitle, emptyDescription, refreshKey = 0 }: {
  scope?: 'all' | 'following'; author?: string; tag?: string; emptyTitle?: string; emptyDescription?: string; refreshKey?: number;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await postsApi.feed({ scope, author, tag, limit: 10 });
      setPosts(r.posts); setCursor(r.nextCursor);
    } catch (err) { setError(errorMessage(err, 'Could not load the feed.')); } finally { setLoading(false); }
  }, [scope, author, tag]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const more = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await postsApi.feed({ scope, author, tag, cursor, limit: 10 });
      setPosts((prev) => [...prev, ...r.posts.filter((p) => !prev.some((x) => x.id === p.id))]);
      setCursor(r.nextCursor);
    } catch (err) { setError(errorMessage(err)); } finally { setLoadingMore(false); }
  }, [cursor, loadingMore, scope, author, tag]);

  if (loading) return <Spinner label="Loading posts" />;
  if (error && posts.length === 0) return <ErrorState message={error} onRetry={load} />;
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<Newspaper size={32} />}
        title={emptyTitle || 'No posts yet'}
        description={emptyDescription || 'Be the first to share something with the community.'}
        action={<Link href="/create" className="text-sm font-semibold text-indigo-400">Create a post</Link>}
      />
    );
  }

  return (
    <div className="space-y-5">
      {posts.map((p) => <PostCard key={p.id} post={p} onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))} />)}
      <LoadMore onVisible={more} loading={loadingMore} hasMore={Boolean(cursor)} />
    </div>
  );
}
