"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import { authApi, errorMessage } from '@/lib/api';

const field = 'w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/60';
const btn = 'w-full py-3 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 flex items-center justify-center gap-2';

function ForgotInner() {
  const token = useSearchParams().get('token');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setDone('If an account exists for that email, we sent a link to reset your password. It expires in 1 hour.');
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true); setError('');
    try {
      await authApi.resetPassword(token!, password);
      router.replace('/auth/login');
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  if (token) {
    return (
      <form onSubmit={reset} className="space-y-4">
        <h1 className="text-3xl font-bold">Choose a new password</h1>
        <input type="password" aria-label="New password" className={field} placeholder="New password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <input type="password" aria-label="Confirm new password" className={field} placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
        <button className={btn} disabled={busy || !password || !confirm}>{busy && <Loader2 size={16} className="animate-spin" />}Update password</button>
      </form>
    );
  }

  return (
    <form onSubmit={requestLink} className="space-y-4">
      <h1 className="text-3xl font-bold">Reset your password</h1>
      <p className="text-sm text-zinc-400">Enter the email you signed up with and we&apos;ll send you a reset link.</p>
      {done ? (
        <p className="text-sm text-emerald-400" role="status">{done}</p>
      ) : (
        <>
          <input type="email" aria-label="Email address" className={field} placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
          <button className={btn} disabled={busy || !email}>{busy && <Loader2 size={16} className="animate-spin" />}Send reset link</button>
        </>
      )}
      <p className="text-sm text-center"><Link href="/auth/login" className="text-indigo-400">Back to sign in</Link></p>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return <AuthLayout><Suspense><ForgotInner /></Suspense></AuthLayout>;
}
