import { Suspense } from 'react';
import type { Metadata } from 'next';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthForm from '@/components/auth/AuthForm';
import RedirectIfSignedIn from '@/components/auth/RedirectIfSignedIn';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <AuthLayout>
      <Suspense>
        <RedirectIfSignedIn />
        <AuthForm initialMode="register" />
      </Suspense>
    </AuthLayout>
  );
}
