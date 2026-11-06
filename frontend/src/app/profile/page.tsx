"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/common';

export default function ProfileRedirect() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => { if (user) router.replace(`/profile/${user.username}`); }, [user, router]);
  return <Spinner />;
}
