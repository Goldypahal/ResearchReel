"use client";

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from '@/components/ui/LandingPage';
import { useAuth } from '@/context/AuthContext';

export default function Root() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace('/home');
  }, [user, router]);

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <LandingPage />
    </Suspense>
  );
}
