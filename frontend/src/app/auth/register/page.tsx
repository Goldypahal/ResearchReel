"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import AuthShell, { Field, FormError, SubmitButton } from '@/components/auth/AuthShell';
import OTPVerification from '@/components/auth/OTPVerification';
import { useAuthFlow } from '@/lib/useAuthFlow';

const USERNAME_RE = /^[A-Za-z0-9_.]{3,30}$/;

/** Suggests a valid handle from the email's local part. */
const suggestUsername = (email: string) =>
  email.split('@')[0].replace(/[^A-Za-z0-9_.]/g, '_').slice(0, 30);

function RegisterForm() {
  const flow = useAuthFlow();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (flow.step === 'verify') {
    return (
      <AuthShell>
        <OTPVerification
          email={flow.email}
          onVerify={flow.verify}
          onResend={flow.resend}
          isLoading={flow.busy}
          error={flow.error}
          notice={flow.notice}
          onBack={flow.back}
        />
      </AuthShell>
    );
  }

  const usernameInvalid = username.length > 0 && !USERNAME_RE.test(username);
  const passwordShort = password.length > 0 && password.length < 8;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInvalid || passwordShort) return;
    flow.signUp({ email: email.trim(), username: username.trim(), password, full_name: fullName.trim() });
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Share research as reels, read papers with AI, and work with collaborators."
      footer={<>Already have an account? <Link href="/auth/login" className="text-white font-medium hover:text-indigo-300">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <FormError message={flow.error} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" name="full_name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Field
            label="Username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setUsernameTouched(true); }}
            hint={usernameInvalid ? '3–30 letters, numbers, dots or underscores.' : undefined}
            required
          />
        </div>
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (!usernameTouched) setUsername(suggestUsername(e.target.value));
          }}
          placeholder="you@university.edu"
          required
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={passwordShort ? 'Use at least 8 characters.' : 'At least 8 characters.'}
          required
        />

        <div className="flex gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-sm text-zinc-300">
          <BadgeCheck size={18} className="text-indigo-400 shrink-0 mt-0.5" />
          <p>After sign-up you can get a verified badge in Settings — <span className="text-white">Student</span> with a university email, or <span className="text-white">Scholar</span> by connecting ORCID.</p>
        </div>

        <SubmitButton busy={flow.busy} disabled={!fullName || !username || !email || !password || usernameInvalid || passwordShort}>
          Create account
        </SubmitButton>
        <p className="text-xs text-zinc-500 text-center">
          By creating an account you agree to our <Link href="/support#terms" className="underline hover:text-zinc-300">Terms</Link> and <Link href="/support#privacy" className="underline hover:text-zinc-300">Privacy Policy</Link>.
        </p>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <RegisterForm />
    </Suspense>
  );
}
