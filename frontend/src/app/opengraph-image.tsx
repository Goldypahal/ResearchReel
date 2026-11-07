import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from '@/lib/og';

export const alt = 'ResearchReel — share research as reels, read papers with AI';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return shareCard({
    kicker: 'For researchers',
    title: 'Share research as reels. Read papers with AI.',
    subtitle: 'Posts, lectures and projects with verified scholars and students.',
  });
}
