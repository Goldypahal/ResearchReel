"use client";

import React, { useEffect, useState } from 'react';
import { Ban, VolumeX } from 'lucide-react';
import { usersApi, errorMessage, type BlockedAccount } from '@/lib/api';
import { Avatar, Spinner, UserLink, secondaryBtn } from '@/components/common';
import { toast } from '@/components/ui/use-toast';
import { timeAgo } from '@/lib/format';

type Kind = 'blocked' | 'muted';

function AccountList({ kind, title, icon: Icon, empty, hint, action, accounts, onUndo }: {
  kind: Kind; title: string; icon: React.ElementType; empty: string; hint: string; action: string;
  accounts: BlockedAccount[]; onUndo: (kind: Kind, u: BlockedAccount) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold flex items-center gap-2"><Icon size={16} /> {title}</h2>
        <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>
      </div>
      {accounts.length === 0 ? <p className="text-sm text-zinc-500">{empty}</p> : (
        <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
          {accounts.map((u) => (
            <li key={u.id} className="flex items-center gap-3 p-3">
              <Avatar src={u.avatar_url} name={u.full_name} size={36} />
              <div className="min-w-0 flex-1">
                <UserLink username={u.username} fullName={u.full_name} status={u.verification_status} className="text-sm" />
                <p className="text-xs text-zinc-500">@{u.username} · {timeAgo(u.created_at)}</p>
              </div>
              <button onClick={() => onUndo(kind, u)} className={secondaryBtn}>{action}</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Settings → Blocked & muted: the accounts you've blocked or muted, with one-click undo. */
export default function PrivacySettings() {
  const [data, setData] = useState<{ blocked: BlockedAccount[]; muted: BlockedAccount[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { usersApi.blocks().then(setData).catch((e) => setError(errorMessage(e))); }, []);

  const undo = async (kind: Kind, u: BlockedAccount) => {
    try {
      if (kind === 'blocked') await usersApi.unblock(u.username); else await usersApi.unmute(u.username);
      setData((d) => d && { ...d, [kind]: d[kind].filter((x) => x.id !== u.id) });
      toast({ title: kind === 'blocked' ? `Unblocked @${u.username}` : `Unmuted @${u.username}` });
    } catch (err) { toast({ title: 'Something went wrong', description: errorMessage(err), variant: 'destructive' }); }
  };

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <Spinner />;

  return (
    <div className="space-y-8">
      <AccountList kind="blocked" title="Blocked accounts" icon={Ban} action="Unblock" empty="You haven’t blocked anyone."
        hint="You and these accounts can’t see each other’s profiles or posts, comment, mention or message each other."
        accounts={data.blocked} onUndo={undo} />
      <AccountList kind="muted" title="Muted accounts" icon={VolumeX} action="Unmute" empty="You haven’t muted anyone."
        hint="Their posts, reels and stories are hidden from your feeds. They aren’t told and can still interact with you."
        accounts={data.muted} onUndo={undo} />
    </div>
  );
}
