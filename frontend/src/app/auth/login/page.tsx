"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import AuthShell, { Field, FormError, SubmitButton } from '@/components/auth/AuthShell';
import OTPVerification from '@/components/auth/OTPVerification';
import { useAuthFlow } from '@/lib/useAuthFlow';

function LoginForm() {
  const flow = useAuthFlow();
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

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your research feed, library and projects."
      footer={<>New to ResearchReel? <Link href="/auth/register" className="text-white font-medium hover:text-indigo-300">Create an account</Link></>}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); flow.signIn(email.trim(), password); }}
        className="space-y-5"
      >
        <FormError message={flow.error} />
        <Field label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" required />
        <div className="space-y-1.5">
          <Field label="Password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className="text-right">
            <Link href={`/auth/forget-password${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="text-sm text-indigo-400 hover:text-indigo-300">
              Forgot password?
            </Link>
          </div>
        </div>
        <SubmitButton busy={flow.busy} disabled={!email || !password}>Sign in</SubmitButton>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginForm />
    </Suspense>
  );
}
