"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthForm from '@/components/auth/AuthForm';

function VerifyInner() {
  const email = useSearchParams().get('email') || '';
  return <AuthForm initialMode={email ? 'verify' : 'login'} initialEmail={email} />;
}

export default function VerifyPage() {
  return (
    <AuthLayout>
      <Suspense><VerifyInner /></Suspense>
    </AuthLayout>
  );
}
