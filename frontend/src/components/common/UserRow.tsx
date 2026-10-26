import Link from 'next/link';
import type { UserCard } from '@/lib/api';
import { displayName } from '@/lib/utils';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import FollowButton from './FollowButton';

export default function UserRow({ user, subtitle, onNavigate }: { user: UserCard; subtitle?: string; onNavigate?: () => void }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Link href={`/profile/${user.username}`} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar src={user.avatar_url} name={displayName(user)} size="md" />
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="truncate text-sm font-semibold">{displayName(user)}</span>
            <VerifiedBadge status={user.verification_status} size={13} />
          </div>
          <p className="truncate text-xs text-muted-foreground">
            @{user.username}{subtitle ? ` · ${subtitle}` : user.institution ? ` · ${user.institution}` : ''}
          </p>
        </div>
      </Link>
      <FollowButton username={user.username} initialFollowing={user.is_following} size="sm" />
    </div>
  );
}
