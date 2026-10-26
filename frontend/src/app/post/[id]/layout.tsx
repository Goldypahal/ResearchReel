import type { Metadata } from 'next';
import { excerpt, serverGet, type PublicPost } from '@/lib/server-api';

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await serverGet<PublicPost>(`/posts/${encodeURIComponent(id)}`);
  if (!post) return { title: 'Post not found', robots: { index: false } };
  const author = post.full_name || `@${post.username}`;
  const text = post.document_title || post.caption || 'A post on ResearchReel';
  const description = excerpt(post.summary_text || post.caption || `${author} shared research on ResearchReel.`);
  const title = `${author}: ${excerpt(text, 70)}`;
  return {
    title,
    description,
    alternates: { canonical: `/post/${post.id}` },
    openGraph: { type: 'article', title, description, url: `/post/${post.id}`, publishedTime: post.created_at, authors: [author], tags: post.tags || undefined },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function PostLayout({ children }: Props) {
  return children;
}
