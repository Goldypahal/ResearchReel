import { Suspense } from 'react';
import type { Metadata } from 'next';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthForm from '@/components/auth/AuthForm';
import RedirectIfSignedIn from '@/components/auth/RedirectIfSignedIn';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense>
        <RedirectIfSignedIn />
        <AuthForm initialMode="login" />
      </Suspense>
    </AuthLayout>
  );
}
