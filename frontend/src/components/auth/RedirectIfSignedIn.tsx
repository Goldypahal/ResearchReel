"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RedirectIfSignedIn() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get('next');
  useEffect(() => {
    if (!isLoading && user) router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/home');
  }, [user, isLoading, router, next]);
  return null;
}
