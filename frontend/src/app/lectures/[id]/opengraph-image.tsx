import { serverGet, type PublicLecture } from '@/lib/server-api';
import { OG_CONTENT_TYPE, OG_SIZE, VERIFIED_STATUSES, shareCard } from '@/lib/og';

export const alt = 'A lecture on ResearchReel';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = await serverGet<PublicLecture>(`/lectures/${encodeURIComponent(id)}`, 60);
  if (!l) return shareCard({ kicker: 'Lecture', title: 'Live lectures from researchers' });
  // Crawlers have no time zone, so show UTC explicitly.
  const when = l.scheduled_at
    ? `${new Date(l.scheduled_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`
    : 'Lecture';
  const status = l.status === 'live' ? 'Live now' : l.status === 'ended' ? 'Lecture' : when;
  return shareCard({
    kicker: [l.topic, status].filter(Boolean).join(' · '),
    title: l.title,
    subtitle: `with ${l.host_name || `@${l.host_username}`}${l.host_institution ? `, ${l.host_institution}` : ''}`,
    footer: `${l.attendee_count} registered`,
    verified: VERIFIED_STATUSES.includes(l.host_verification_status || ''),
    accent: '#0ea5e9',
  });
}
