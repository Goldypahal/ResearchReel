"use client";

import React, { Suspense } from 'react';
import Link from 'next/link';
import AuthForm from '@/components/auth/AuthForm';
import LandingPortrait from './LandingPortrait';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex flex-col overflow-hidden">
      <main className="flex-grow flex flex-col lg:flex-row">
        <LandingPortrait />
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-[360px] flex flex-col justify-center animate-in fade-in slide-in-from-right-8 duration-1000">
            <div className="lg:hidden flex justify-center mb-10">
              <span className="text-4xl font-bold tracking-tight">ResearchReel</span>
            </div>
            <Suspense><AuthForm initialMode="login" /></Suspense>
          </div>
        </div>
      </main>
      <footer className="w-full py-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-zinc-500 px-4">
        <Link href="/support" className="hover:underline">Help</Link>
        <Link href="/support#terms" className="hover:underline">Terms</Link>
        <Link href="/support#privacy" className="hover:underline">Privacy</Link>
        <Link href="/support#guidelines" className="hover:underline">Community guidelines</Link>
        <span>© {new Date().getFullYear()} ResearchReel</span>
      </footer>
    </div>
  );
}
