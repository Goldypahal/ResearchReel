import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Lectures', template: '%s · ResearchReel' },
  description: 'Live lectures from verified scholars and faculty. Register, add them to your calendar and ask questions.',
  alternates: { canonical: '/lectures' },
  openGraph: { type: 'website', siteName: 'ResearchReel', title: 'Lectures · ResearchReel', description: 'Live lectures from verified scholars and faculty. Register, add them to your calendar and ask questions.', url: '/lectures' },
};

export default function LecturesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
