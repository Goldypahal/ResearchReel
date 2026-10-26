"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { errorMessage, usersApi, type BlockedAccount } from '@/lib/api';
import { timeAgo, displayName } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { ErrorState, SkeletonRows } from '@/components/common/States';
import Avatar from '@/components/common/Avatar';
import { Card, SecondaryButton } from './Field';

type Kind = 'blocked' | 'muted';

/** Accounts the user blocked or muted, with one-click undo. */
export default function PrivacySettings() {
  const [data, setData] = useState<{ blocked: BlockedAccount[]; muted: BlockedAccount[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await usersApi.getBlocked());
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
  useEffect(() => { load(); }, [load]);

  const undo = async (kind: Kind, account: BlockedAccount) => {
    setBusy(`${kind}:${account.id}`);
    try {
      if (kind === 'blocked') await usersApi.unblock(account.username);
      else await usersApi.unmute(account.username);
      setData((d) => (d ? { ...d, [kind]: d[kind].filter((a) => a.id !== account.id) } : d));
      toast({ title: kind === 'blocked' ? `Unblocked @${account.username}` : `Unmuted @${account.username}` });
    } catch (err) {
      toast({ title: 'Something went wrong', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const list = (kind: Kind, accounts: BlockedAccount[], empty: string) => (
    accounts.length === 0 ? (
      <p className="text-xs text-muted-foreground">{empty}</p>
    ) : (
      <ul className="divide-y divide-[var(--border)]">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <Avatar src={a.avatar_url} name={displayName(a)} size="sm" />
            <div className="min-w-0 flex-1">
              <Link href={`/profile/${a.username}`} className="block truncate text-sm font-semibold hover:underline">{displayName(a)}</Link>
              <p className="truncate text-xs text-muted-foreground">@{a.username} · {kind === 'blocked' ? 'blocked' : 'muted'} {timeAgo(a.created_at)}</p>
            </div>
            <SecondaryButton disabled={busy === `${kind}:${a.id}`} onClick={() => undo(kind, a)}>
              {kind === 'blocked' ? 'Unblock' : 'Unmute'}
            </SecondaryButton>
          </li>
        ))}
      </ul>
    )
  );

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <>
      <Card title="Blocked accounts" description="Blocked accounts can't find your profile, see your posts, follow, comment on, mention or message you. They aren't told.">
        {data ? list('blocked', data.blocked, "You haven't blocked anyone.") : <SkeletonRows rows={2} />}
      </Card>
      <Card title="Muted accounts" description="Posts and stories from muted accounts don't appear in your feed. You still follow them, and they can't tell.">
        {data ? list('muted', data.muted, "You haven't muted anyone.") : <SkeletonRows rows={2} />}
      </Card>
    </>
  );
}
