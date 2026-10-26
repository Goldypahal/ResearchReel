import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Reels', template: '%s · ResearchReel' },
  description: 'Short video explainers of new research, made by the people who did it.',
  alternates: { canonical: '/reels' },
  openGraph: { type: 'website', siteName: 'ResearchReel', title: 'Reels · ResearchReel', description: 'Short video explainers of new research, made by the people who did it.', url: '/reels' },
};

export default function ReelsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
