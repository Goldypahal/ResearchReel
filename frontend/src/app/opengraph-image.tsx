import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from '@/lib/og';

export const alt = 'ResearchReel: share research as posts, papers and reels';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return shareCard({
    kicker: 'For researchers',
    title: 'Share research as reels. Read papers with AI.',
    subtitle: 'Posts, papers, lectures and projects with researchers worldwide.',
  });
}
