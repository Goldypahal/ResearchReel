"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Laptop, Smartphone } from 'lucide-react';
import { authApi, errorMessage, type Session } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { ErrorState, SkeletonRows } from '@/components/common/States';
import { Card, Field, inputClass, PrimaryButton, SecondaryButton } from './Field';

/** "Chrome on macOS" from a user-agent string — good enough to recognise your own devices. */
function describe(ua?: string | null) {
  if (!ua) return { label: 'Unknown device', mobile: false };
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /node|undici|curl/i.test(ua) ? 'API client' : 'Browser';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
  return { label: os ? `${browser} on ${os}` : browser, mobile: /Mobile|iPhone|Android/.test(ua) };
}

export default function SecuritySettings() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmNext, setConfirmNext] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setSessionsError(null);
    try { setSessions(await authApi.sessions()); } catch (err) { setSessionsError(errorMessage(err)); }
  }, []);
  useEffect(() => { loadSessions(); }, [loadSessions]);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (next.length < 8) return setPwError('Use at least 8 characters.');
    if (next !== confirmNext) return setPwError("The new passwords don't match.");
    setSavingPw(true);
    try {
      const { revoked } = await authApi.changePassword(current, next);
      setCurrent(''); setNext(''); setConfirmNext('');
      toast({ title: 'Password updated', description: revoked ? `Signed out ${revoked} other ${revoked === 1 ? 'device' : 'devices'}.` : undefined, variant: 'success' });
      loadSessions();
    } catch (err) {
      setPwError(errorMessage(err));
    } finally {
      setSavingPw(false);
    }
  };

  const revoke = async (id: string) => {
    setBusyId(id);
    try {
      await authApi.revokeSession(id);
      setSessions((s) => s?.filter((x) => x.id !== id) || null);
    } catch (err) {
      toast({ title: 'Could not sign out that device', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const revokeOthers = async () => {
    setBusyId('others');
    try {
      const { revoked } = await authApi.revokeOtherSessions();
      toast({ title: revoked ? `Signed out of ${revoked} other ${revoked === 1 ? 'device' : 'devices'}` : 'No other devices were signed in', variant: 'success' });
      loadSessions();
    } catch (err) {
      toast({ title: 'Could not sign out other devices', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const others = sessions?.filter((s) => !s.current).length || 0;

  return (
    <>
      <Card title="Password" description="Changing your password signs you out everywhere else.">
        <form onSubmit={changePassword} className="space-y-4">
          {pwError && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{pwError}</div>}
          <Field label="Current password" htmlFor="pw-cur">
            <input id="pw-cur" type="password" autoComplete="current-password" required className={inputClass} value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="New password" htmlFor="pw-new" hint="At least 8 characters.">
              <input id="pw-new" type="password" autoComplete="new-password" required minLength={8} className={inputClass} value={next} onChange={(e) => setNext(e.target.value)} />
            </Field>
            <Field label="Confirm new password" htmlFor="pw-conf">
              <input id="pw-conf" type="password" autoComplete="new-password" required className={inputClass} value={confirmNext} onChange={(e) => setConfirmNext(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end"><PrimaryButton type="submit" busy={savingPw}>Update password</PrimaryButton></div>
        </form>
      </Card>

      <Card title="Where you're signed in" description="Sign out of any device you don't recognise.">
        {sessionsError ? (
          <ErrorState message={sessionsError} onRetry={loadSessions} />
        ) : !sessions ? (
          <SkeletonRows rows={2} />
        ) : (
          <>
            <ul className="divide-y divide-[var(--border)]">
              {sessions.map((s) => {
                const d = describe(s.user_agent);
                const Icon = d.mobile ? Smartphone : Laptop;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Icon size={20} className="shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {d.label} {s.current && <span className="ml-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-500">This device</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.ip_address ? `${s.ip_address} · ` : ''}Active {timeAgo(s.last_used_at || s.created_at)} · Signed in {new Date(s.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {!s.current && (
                      <SecondaryButton onClick={() => revoke(s.id)} disabled={busyId === s.id}>Sign out</SecondaryButton>
                    )}
                  </li>
                );
              })}
            </ul>
            {others > 0 && (
              <div className="flex justify-end">
                <SecondaryButton onClick={revokeOthers} disabled={busyId === 'others'}>Sign out of all other devices</SecondaryButton>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
