"use client";

import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Ban, VolumeX, Volume2, Flag } from 'lucide-react';
import { usersApi, errorMessage, type Profile } from '@/lib/api';
import { Modal, dangerBtn, secondaryBtn } from '@/components/common';
import { toast } from '@/components/ui/use-toast';

/** The ⋯ menu on someone else's profile: mute/unmute and block (with confirmation). */
export default function ProfileMenu({ profile, onChange }: { profile: Profile; onChange: (patch: Partial<Profile>) => void }) {
  const [open, setOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggleMute = async () => {
    setOpen(false);
    try {
      const r = profile.is_muted ? await usersApi.unmute(profile.username) : await usersApi.mute(profile.username);
      onChange({ is_muted: r.is_muted });
      toast({ title: r.is_muted ? `Muted @${profile.username}` : `Unmuted @${profile.username}`, description: r.is_muted ? 'Their posts, reels and stories won’t appear in your feeds. They won’t be told.' : undefined });
    } catch (err) { toast({ title: 'Something went wrong', description: errorMessage(err), variant: 'destructive' }); }
  };

  const block = async () => {
    setBusy(true);
    try {
      await usersApi.block(profile.username);
      setConfirmBlock(false);
      onChange({ is_blocked: true, is_following: false });
      toast({ title: `Blocked @${profile.username}` });
    } catch (err) { toast({ title: 'Could not block', description: errorMessage(err), variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="More options" aria-expanded={open} className="p-2 rounded-xl hover:bg-[var(--foreground)]/5"><MoreHorizontal size={18} /></button>
      {open && (
        <div role="menu" className="absolute right-0 sm:left-0 sm:right-auto z-30 mt-1 w-56 rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-2xl overflow-hidden text-sm">
          <button role="menuitem" onClick={toggleMute} className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-[var(--foreground)]/5">
            {profile.is_muted ? <Volume2 size={15} /> : <VolumeX size={15} />} {profile.is_muted ? 'Unmute' : 'Mute'} @{profile.username}
          </button>
          <button role="menuitem" onClick={() => { setOpen(false); setConfirmBlock(true); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-red-400 hover:bg-[var(--foreground)]/5">
            <Ban size={15} /> Block @{profile.username}
          </button>
          <a role="menuitem" href="/support#guidelines" className="flex w-full items-center gap-2 px-3 py-2.5 text-zinc-400 hover:bg-[var(--foreground)]/5">
            <Flag size={15} /> Community guidelines
          </a>
        </div>
      )}
      <Modal open={confirmBlock} onClose={() => setConfirmBlock(false)} title={`Block @${profile.username}?`}>
        <div className="p-5 space-y-4 text-sm">
          <p className="text-zinc-400">You’ll stop following each other. They won’t be able to find your profile, see your posts, comment, mention you or message you. They won’t be notified that you blocked them.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmBlock(false)} className={secondaryBtn}>Cancel</button>
            <button onClick={block} disabled={busy} className={dangerBtn}>{busy ? 'Blocking…' : 'Block'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
