import type { Metadata } from 'next';
import { excerpt, serverGet, type PublicLecture } from '@/lib/server-api';

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const l = await serverGet<PublicLecture>(`/lectures/${encodeURIComponent(id)}`, 60);
  if (!l) return { title: 'Lecture not found', robots: { index: false } };
  const host = l.host_name || `@${l.host_username}`;
  const description = excerpt(`${l.topic} lecture by ${host}. ${l.description}`);
  return {
    title: l.title,
    description,
    alternates: { canonical: `/lectures/${l.id}` },
    robots: l.status === 'cancelled' ? { index: false } : undefined,
    openGraph: { type: 'website', title: l.title, description, url: `/lectures/${l.id}` },
    twitter: { card: 'summary_large_image', title: l.title, description },
  };
}

export default function LectureLayout({ children }: Props) {
  return children;
}
