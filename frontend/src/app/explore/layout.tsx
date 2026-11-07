import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Explore', template: '%s · ResearchReel' },
  description: 'Discover research posts, papers and reels from scholars and students.',
  alternates: { canonical: '/explore' },
  openGraph: { type: 'website', siteName: 'ResearchReel', title: 'Explore · ResearchReel', description: 'Discover research posts, papers and reels from scholars and students.', url: '/explore' },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
