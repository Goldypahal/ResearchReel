import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lectures',
  description: 'Live and upcoming lectures from researchers, open to register.',
  alternates: { canonical: '/lectures' },
  openGraph: { type: 'website', siteName: 'ResearchReel', title: 'Lectures · ResearchReel', description: 'Live and upcoming lectures from researchers, open to register.', url: '/lectures' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
