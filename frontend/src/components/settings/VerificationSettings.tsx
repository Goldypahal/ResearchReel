"use client";

import React, { useEffect, useState } from 'react';
import { BadgeCheck, CheckCircle2, GraduationCap, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authApi, errorMessage } from '@/lib/api';
import { isVerifiedScholar } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Card, Field, inputClass, PrimaryButton, SecondaryButton } from './Field';

const ORCID_RESULT: Record<string, { title: string; ok: boolean }> = {
  connected: { title: 'ORCID connected — you now have the verified scholar badge.', ok: true },
  cancelled: { title: 'ORCID sign-in was cancelled.', ok: false },
  expired: { title: 'That ORCID sign-in expired. Please try again.', ok: false },
  in_use: { title: 'That ORCID iD is already linked to another ResearchReel account.', ok: false },
  failed: { title: 'We could not verify your ORCID iD. Please try again.', ok: false },
};

function Row({ icon: Icon, title, status, children }: { icon: React.ElementType; title: string; status: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><Icon size={16} className="text-indigo-400" /> {title}</div>
        <div className="text-xs">{status}</div>
      </div>
      {children}
    </div>
  );
}

const Done = ({ label }: { label: string }) => <span className="inline-flex items-center gap-1 font-semibold text-emerald-500"><CheckCircle2 size={14} /> {label}</span>;

export default function VerificationSettings({ orcidResult }: { orcidResult?: string | null }) {
  const { user, refreshUser } = useAuth();
  const [uniEmail, setUniEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [studentError, setStudentError] = useState<string | null>(null);

  useEffect(() => {
    if (!orcidResult || !ORCID_RESULT[orcidResult]) return;
    const r = ORCID_RESULT[orcidResult];
    toast({ title: r.title, variant: r.ok ? 'success' : 'destructive' });
    if (r.ok) refreshUser();
  }, [orcidResult, refreshUser]);

  if (!user) return null;
  const status = user.verification_status;
  const isStudent = status === 'student';
  const isScholar = isVerifiedScholar(status);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('send');
    setStudentError(null);
    try {
      const r = await authApi.verifyStudent(uniEmail.trim());
      setSentTo(r.email);
    } catch (err) {
      setStudentError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('confirm');
    setStudentError(null);
    try {
      await authApi.confirmStudent(code.trim());
      await refreshUser();
      setSentTo(null);
      setCode('');
      toast({ title: 'You are now a verified student', variant: 'success' });
    } catch (err) {
      setStudentError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const connectOrcid = async () => {
    setBusy('orcid');
    try {
      const { url } = await authApi.orcidStart();
      window.location.assign(url);
    } catch (err) {
      toast({ title: 'ORCID unavailable', description: errorMessage(err), variant: 'destructive' });
      setBusy(null);
    }
  };

  const disconnectOrcid = async () => {
    setBusy('orcid');
    try {
      await authApi.orcidDisconnect();
      await refreshUser();
    } catch (err) {
      toast({ title: 'Could not disconnect ORCID', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card title="Verification" description="Badges tell people your work is from a real researcher. Each one is checked, not self-declared.">
      <Row icon={Mail} title="Email" status={status === 'unverified' ? <span className="text-amber-400">Not confirmed</span> : <Done label="Confirmed" />}>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </Row>

      <Row icon={BadgeCheck} title="ORCID (verified scholar)" status={user.orcid_id ? <Done label="Connected" /> : <span className="text-muted-foreground">Not connected</span>}>
        {user.orcid_id ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a href={`https://orcid.org/${user.orcid_id}`} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline">orcid.org/{user.orcid_id}</a>
            <SecondaryButton onClick={disconnectOrcid} disabled={busy === 'orcid'}>Disconnect</SecondaryButton>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Sign in with ORCID to prove the iD is yours.</p>
            <PrimaryButton onClick={connectOrcid} busy={busy === 'orcid'}>Connect ORCID</PrimaryButton>
          </div>
        )}
      </Row>

      <Row icon={GraduationCap} title="Student" status={isStudent ? <Done label="Verified" /> : isScholar ? <span className="text-muted-foreground">Not needed</span> : <span className="text-muted-foreground">Not verified</span>}>
        {!isStudent && !isScholar && (
          <>
            {studentError && <p role="alert" className="text-xs text-red-400">{studentError}</p>}
            {!sentTo ? (
              <form onSubmit={sendCode} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Field label="University email" htmlFor="s-uni">
                    <input id="s-uni" type="email" required className={inputClass} placeholder="you@university.edu" value={uniEmail} onChange={(e) => setUniEmail(e.target.value)} />
                  </Field>
                </div>
                <PrimaryButton type="submit" busy={busy === 'send'}>Send code</PrimaryButton>
              </form>
            ) : (
              <form onSubmit={confirm} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Field label={`Code sent to ${sentTo}`} htmlFor="s-code">
                    <input id="s-code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className={inputClass} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
                  </Field>
                </div>
                <PrimaryButton type="submit" busy={busy === 'confirm'}>Verify</PrimaryButton>
                <SecondaryButton type="button" onClick={() => { setSentTo(null); setCode(''); }}>Use another email</SecondaryButton>
              </form>
            )}
          </>
        )}
      </Row>
    </Card>
  );
}
