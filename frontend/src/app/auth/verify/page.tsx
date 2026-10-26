import { redirect } from 'next/navigation';

/** Verification (student email, ORCID) lives in Settings; keep old links working. */
export default function VerifyPage() {
  redirect('/settings?tab=verification');
}
