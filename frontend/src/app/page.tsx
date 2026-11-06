"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from '@/components/ui/LandingPage';
import { useAuth } from '@/context/AuthContext';

export default function Root() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && user) router.replace('/home');
  }, [user, isLoading, router]);
  return <LandingPage />;
}
