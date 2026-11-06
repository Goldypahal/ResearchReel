"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { postsApi, errorMessage, type Post } from '@/lib/api';
import { Spinner, ErrorState } from '@/components/common';
import PostCard from '@/components/feed/PostCard';

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { postsApi.get(id).then(setPost).catch((e) => setError(errorMessage(e))); }, [id]);
  return (
    <div className="max-w-xl mx-auto">
      {error ? <ErrorState message={error} /> : !post ? <Spinner /> : <PostCard post={post} onDeleted={() => router.replace('/home')} />}
    </div>
  );
}
