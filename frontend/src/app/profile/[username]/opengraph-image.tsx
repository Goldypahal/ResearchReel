import { serverGet, type PublicProfile } from '@/lib/server-api';
import { OG_CONTENT_TYPE, OG_SIZE, VERIFIED_STATUSES, displayNameOf, shareCard } from '@/lib/og';

export const alt = 'A researcher profile on ResearchReel';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const BADGE: Record<string, string> = { student: 'Verified student', scholar: 'Verified scholar', faculty: 'Faculty' };

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const p = await serverGet<PublicProfile>(`/users/${encodeURIComponent(username)}`);
  if (!p) return shareCard({ kicker: 'Profile', title: 'Researchers sharing their work' });
  const counts = `${p.follower_count} follower${p.follower_count === 1 ? '' : 's'} · ${p.post_count} post${p.post_count === 1 ? '' : 's'}`;
  return shareCard({
    kicker: BADGE[p.verification_status || ''] || 'Researcher',
    title: displayNameOf(p),
    subtitle: p.institution || p.research_interests?.slice(0, 3).join(' · ') || p.bio,
    footer: `@${p.username} · ${counts}`,
    verified: VERIFIED_STATUSES.includes(p.verification_status || ''),
  });
}
