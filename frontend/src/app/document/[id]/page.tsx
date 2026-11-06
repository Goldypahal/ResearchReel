import { redirect } from 'next/navigation';

/** Legacy URL: papers now live under /library/documents/[id]. */
export default async function LegacyDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/library/documents/${id}`);
}
