import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reels',
  description: 'Short explainer videos about research, many generated from the papers themselves.',
  alternates: { canonical: '/reels' },
  openGraph: { type: 'website', siteName: 'ResearchReel', title: 'Reels · ResearchReel', description: 'Short explainer videos about research, many generated from the papers themselves.', url: '/reels' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
