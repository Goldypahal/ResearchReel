"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { errorMessage, usersApi } from '@/lib/api';
import { Card, Field, inputClass } from './Field';

export default function DangerZone() {
  const { logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await usersApi.deleteAccount(password);
      await logout();
      router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Card danger title="Delete account" description="Removes your profile, posts and papers and signs you out everywhere. This can't be undone.">
      {!open ? (
        <button onClick={() => setOpen(true)} className="rounded-xl border border-red-500/40 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10">Delete my account…</button>
      ) : (
        <form onSubmit={remove} className="space-y-4">
          {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>}
          <Field label="Your password" htmlFor="del-pw">
            <input id="del-pw" type="password" autoComplete="current-password" required className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label='Type "DELETE" to confirm' htmlFor="del-confirm">
            <input id="del-confirm" className={inputClass} value={typed} onChange={(e) => setTyped(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setOpen(false); setPassword(''); setTyped(''); }} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-bold">Cancel</button>
            <button type="submit" disabled={busy || typed !== 'DELETE' || !password} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-40">
              {busy ? 'Deleting…' : 'Delete account permanently'}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
