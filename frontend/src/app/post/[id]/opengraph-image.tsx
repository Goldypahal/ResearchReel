import { serverGet, type PublicPost } from '@/lib/server-api';
import { OG_CONTENT_TYPE, OG_SIZE, VERIFIED_STATUSES, displayNameOf, shareCard } from '@/lib/og';

export const alt = 'A research post on ResearchReel';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await serverGet<PublicPost>(`/posts/${encodeURIComponent(id)}`);
  if (!post) return shareCard({ kicker: 'Post', title: 'Research, shared as reels and posts' });
  const kind = post.document_title ? 'Paper' : post.content_type === 'video' ? 'Reel' : 'Post';
  return shareCard({
    kicker: [kind, post.tags?.[0] && `#${post.tags[0]}`].filter(Boolean).join(' · '),
    title: post.document_title || post.caption || 'A post on ResearchReel',
    subtitle: post.document_title ? post.caption : null,
    footer: displayNameOf(post),
    verified: VERIFIED_STATUSES.includes(post.verification_status || ''),
  });
}
