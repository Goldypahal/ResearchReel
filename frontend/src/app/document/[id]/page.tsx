import { redirect } from 'next/navigation';

/** Old reader URL — papers now open in the library reader. */
export default async function LegacyDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/library/documents/${encodeURIComponent(id)}`);
}
