import type { Metadata } from 'next';
import { excerpt, serverGet, type PublicProfile } from '@/lib/server-api';

type Props = { params: Promise<{ username: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const p = await serverGet<PublicProfile>(`/users/${encodeURIComponent(username)}`);
  if (!p) return { title: 'Profile not found', robots: { index: false } };
  const name = p.full_name || `@${p.username}`;
  const title = `${name} (@${p.username})`;
  const description = excerpt(p.bio || [p.institution, p.research_interests?.slice(0, 4).join(', ')].filter(Boolean).join(' · ') || `${name} on ResearchReel.`);
  return {
    title,
    description,
    alternates: { canonical: `/profile/${p.username}` },
    openGraph: { type: 'profile', title, description, url: `/profile/${p.username}`, username: p.username },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function ProfileLayout({ children }: Props) {
  return children;
}
