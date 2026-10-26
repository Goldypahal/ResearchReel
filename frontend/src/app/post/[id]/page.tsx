"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import PostCard from '@/components/feed/PostCard';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/common/States';
import { ApiError, errorMessage, postsApi, type Post } from '@/lib/api';
import { displayName } from '@/lib/utils';

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const p = await postsApi.getPost(id);
      setPost(p);
      document.title = `${(p.caption || p.document_title || 'Post').slice(0, 60)} — ${displayName(p)} · ResearchReel`;
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) setNotFound(true);
      else setError(errorMessage(err));
    }
  }, [id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/explore'))} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[var(--foreground)]">
        <ArrowLeft size={16} /> Back
      </button>
      {notFound ? (
        <EmptyState
          icon={<FileQuestion size={20} />}
          title="This post isn't available"
          description="It may have been deleted, or the link is wrong."
          action={<Link href="/explore" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Explore posts</Link>}
        />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !post ? (
        <LoadingBlock />
      ) : (
        <PostCard post={post} defaultCommentsOpen onDeleted={() => router.push('/home')} />
      )}
    </div>
  );
}
