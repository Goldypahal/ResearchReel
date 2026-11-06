"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { authApi, ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type Mode = 'login' | 'register' | 'verify';

const field = 'w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/60 transition-colors';
const label = 'block text-xs font-semibold text-zinc-400 mb-1.5';

/** Only allow redirecting to in-app paths after sign-in. */
const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/auth') ? next : '/home');

export default function AuthForm({ initialMode = 'login', initialEmail = '', compact = false }: { initialMode?: Mode; initialEmail?: string; compact?: boolean }) {
  const router = useRouter();
  const search = useSearchParams();
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const next = safeNext(search.get('next'));

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Suggest a username from the name until the user edits it.
  useEffect(() => {
    if (usernameTouched) return;
    const base = (fullName || email.split('@')[0] || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9_.]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24);
    setUsername(base);
  }, [fullName, email, usernameTouched]);

  const switchMode = (m: Mode) => { setMode(m); setError(''); setInfo(''); };

  const finish = (user: Parameters<typeof login>[0]) => {
    login(user);
    router.replace(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const r = await authApi.login(email.trim(), password);
        finish(r.user);
      } else if (mode === 'register') {
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        const r = await authApi.register({ email: email.trim(), username: username.trim(), password, full_name: fullName.trim() });
        if (r.requiresVerification === false && r.user) finish(r.user);
        else { setMode('verify'); setCooldown(30); setInfo(`We sent a 6-digit code to ${email.trim()}.`); }
      } else {
        const r = await authApi.verifyOtp(email.trim(), otp.trim());
        finish(r.user);
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        setMode('verify'); setCooldown(30);
        setInfo('Your email is not verified yet. We sent you a new code.');
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      await authApi.resendOtp(email.trim());
      setInfo('A new code is on its way.');
      setCooldown(30);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const canSubmit = !busy && (
    mode === 'login' ? email && password :
    mode === 'register' ? email && password && fullName.trim() && username.length >= 3 :
    /^\d{6}$/.test(otp)
  );

  return (
    <div className="w-full">
      {!compact && (
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Join ResearchReel' : 'Check your email'}
          </h1>
          <p className="text-zinc-400 text-sm">
            {mode === 'login' ? 'Sign in to continue to your research feed.' : mode === 'register' ? 'Create your researcher profile in a minute.' : 'Enter the verification code to finish signing up.'}
          </p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4" noValidate>
        {mode === 'verify' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm text-indigo-200">
              <ShieldCheck size={18} className="shrink-0" />
              <span>Code sent to <strong className="text-white">{email}</strong></span>
            </div>
            <div>
              <label htmlFor="otp" className={label}>Verification code</label>
              <input
                id="otp" className={`${field} tracking-[0.5em] text-center text-lg font-mono`} inputMode="numeric" autoComplete="one-time-code"
                maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus placeholder="••••••"
              />
            </div>
          </div>
        ) : (
          <>
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="fullName" className={label}>Full name</label>
                  <input id="fullName" className={field} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required maxLength={100} />
                </div>
                <div>
                  <label htmlFor="username" className={label}>Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
                    <input
                      id="username" className={`${field} pl-8`} value={username} maxLength={30} autoComplete="username"
                      onChange={(e) => { setUsernameTouched(true); setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')); }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">3–30 characters: letters, numbers, underscores and dots.</p>
                </div>
              </>
            )}
            <div>
              <label htmlFor="email" className={label}>Email</label>
              <input id="email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className={label}>Password</label>
                {mode === 'login' && <Link href="/auth/forget-password" className="text-xs text-indigo-400 hover:text-indigo-300 mb-1.5">Forgot password?</Link>}
              </div>
              <input
                id="password" type="password" className={field} value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8}
              />
              {mode === 'register' && <p className="text-[11px] text-zinc-500 mt-1">At least 8 characters.</p>}
            </div>
          </>
        )}

        {info && <p className="text-xs text-emerald-400" role="status">{info}</p>}
        {error && <p className="text-xs text-red-400" role="alert">{error}</p>}

        <button type="submit" disabled={!canSubmit} className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
          {busy && <Loader2 size={16} className="animate-spin" />}
          {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Verify email'}
        </button>
      </form>

      <div className="mt-6 text-sm text-zinc-400 text-center space-y-2">
        {mode === 'login' && <p>New to ResearchReel? <button onClick={() => switchMode('register')} className="text-indigo-400 hover:text-indigo-300 font-semibold">Create an account</button></p>}
        {mode === 'register' && <p>Already have an account? <button onClick={() => switchMode('login')} className="text-indigo-400 hover:text-indigo-300 font-semibold">Sign in</button></p>}
        {mode === 'verify' && (
          <>
            <p>
              Didn&apos;t get it?{' '}
              <button onClick={resend} disabled={cooldown > 0} className="text-indigo-400 hover:text-indigo-300 font-semibold disabled:text-zinc-600">
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </p>
            <p><button onClick={() => switchMode('login')} className="text-zinc-500 hover:text-zinc-300">Back to sign in</button></p>
          </>
        )}
      </div>
    </div>
  );
}
