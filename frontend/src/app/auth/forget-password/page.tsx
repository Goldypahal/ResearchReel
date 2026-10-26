"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import AuthShell, { Field, FormError, SubmitButton } from '@/components/auth/AuthShell';
import { authApi, errorMessage } from '@/lib/api';

type Step = 'request' | 'reset' | 'done';

function ForgotPasswordForm() {
  const params = useSearchParams();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState(params.get('email') || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const requestCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    run(async () => {
      await authApi.forgotPassword(email.trim());
      setStep('reset');
      setNotice(`If an account uses ${email.trim()}, a 6-digit code is on its way. It expires in 15 minutes.`);
    }, 'We could not send a reset code. Please try again in a minute.');
  };

  const mismatch = confirm.length > 0 && confirm !== password;

  const reset = (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch || password.length < 8) return;
    run(async () => {
      await authApi.resetPassword(email.trim(), code.trim(), password);
      setStep('done');
    }, 'We could not reset your password.');
  };

  if (step === 'done') {
    return (
      <AuthShell>
        <div className="text-center">
          <CheckCircle2 size={44} className="mx-auto text-emerald-400 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Password updated</h1>
          <p className="text-zinc-400 text-sm mb-8">For your security we signed you out everywhere. Sign in with your new password.</p>
          <Link href="/auth/login" className="inline-flex h-12 px-8 items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl">
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={step === 'request' ? 'Reset your password' : 'Choose a new password'}
      subtitle={step === 'request' ? "Enter the email you signed up with and we'll send you a reset code." : undefined}
      footer={<>Remembered it? <Link href="/auth/login" className="text-white font-medium hover:text-indigo-300">Back to sign in</Link></>}
    >
      {step === 'request' ? (
        <form onSubmit={requestCode} className="space-y-5">
          <FormError message={error} />
          <Field label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" required />
          <SubmitButton busy={busy} disabled={!email}>Send reset code</SubmitButton>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-5" noValidate>
          {notice && <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">{notice}</p>}
          <FormError message={error} />
          <Field label="Reset code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="6-digit code" required />
          <Field label="New password" name="new_password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters." required />
          <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} hint={mismatch ? "Passwords don't match." : undefined} required />
          <SubmitButton busy={busy} disabled={code.length !== 6 || password.length < 8 || mismatch}>Update password</SubmitButton>
          <div className="flex justify-between text-sm">
            <button type="button" onClick={() => { setStep('request'); setError(null); }} className="text-zinc-400 hover:text-white">Change email</button>
            <button type="button" onClick={() => requestCode()} disabled={busy} className="text-indigo-400 hover:text-indigo-300 disabled:opacity-50">Send a new code</button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
