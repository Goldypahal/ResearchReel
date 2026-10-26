"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Ban, MoreHorizontal, VolumeX, Volume2 } from 'lucide-react';
import { errorMessage, usersApi, type Profile } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

interface ProfileMenuProps {
  profile: Profile;
  onChange: (patch: Partial<Profile>) => void;
}

/** "⋯" menu on someone else's profile: mute / block, with a confirmation step for blocking. */
export default function ProfileMenu({ profile, onChange }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setConfirmBlock(false); } };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setConfirmBlock(false); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const run = async (action: () => Promise<unknown>, patch: Partial<Profile>, done: string) => {
    setBusy(true);
    try {
      await action();
      onChange(patch);
      toast({ title: done });
      setOpen(false);
      setConfirmBlock(false);
    } catch (err) {
      toast({ title: 'Something went wrong', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const name = `@${profile.username}`;
  const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--foreground)]/5 disabled:opacity-60';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--foreground)]/5"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-[var(--border)] bg-[var(--background)] p-1.5 shadow-xl">
          {confirmBlock ? (
            <div className="space-y-3 p-2">
              <p className="text-sm font-semibold">Block {name}?</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                They won&apos;t be able to find your profile, see your posts, follow you, comment, or message you. You&apos;ll stop following each other. They aren&apos;t notified.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmBlock(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-[var(--foreground)]/5">Cancel</button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => usersApi.block(profile.username), { is_blocked: true, is_following: false }, `Blocked ${name}`)}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                >
                  Block
                </button>
              </div>
            </div>
          ) : (
            <>
              {!profile.is_blocked && (
                <button
                  role="menuitem"
                  type="button"
                  disabled={busy}
                  className={item}
                  onClick={() => (profile.is_muted
                    ? run(() => usersApi.unmute(profile.username), { is_muted: false }, `Unmuted ${name}`)
                    : run(() => usersApi.mute(profile.username), { is_muted: true }, `Muted ${name}. Their posts won't appear in your feed.`))}
                >
                  {profile.is_muted ? <Volume2 size={15} /> : <VolumeX size={15} />}
                  {profile.is_muted ? 'Unmute' : 'Mute'}
                  <span className="ml-auto text-xs text-muted-foreground">{profile.is_muted ? '' : 'Hide from feed'}</span>
                </button>
              )}
              <button
                role="menuitem"
                type="button"
                disabled={busy}
                className={`${item} text-red-500`}
                onClick={() => (profile.is_blocked
                  ? run(() => usersApi.unblock(profile.username), { is_blocked: false }, `Unblocked ${name}`)
                  : setConfirmBlock(true))}
              >
                <Ban size={15} /> {profile.is_blocked ? 'Unblock' : 'Block'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
