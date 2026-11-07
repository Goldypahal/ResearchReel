import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore',
  description: 'Discover research posts, papers and reels from researchers.',
  alternates: { canonical: '/explore' },
  openGraph: { type: 'website', siteName: 'ResearchReel', title: 'Explore · ResearchReel', description: 'Discover research posts, papers and reels from researchers.', url: '/explore' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
