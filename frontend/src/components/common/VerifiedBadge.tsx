import { BadgeCheck, GraduationCap } from 'lucide-react';
import { isVerifiedScholar } from '@/lib/utils';

export default function VerifiedBadge({ status, size = 14 }: { status?: string | null; size?: number }) {
  if (isVerifiedScholar(status)) {
    return <BadgeCheck size={size} className="text-sky-500 shrink-0" aria-label="Verified scholar" />;
  }
  if (status === 'student') {
    return <GraduationCap size={size} className="text-emerald-500 shrink-0" aria-label="Verified student" />;
  }
  return null;
}
