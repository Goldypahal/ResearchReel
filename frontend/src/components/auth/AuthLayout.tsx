import React from 'react';
import Link from 'next/link';
import { Library } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-lg">
          <Library size={22} className="text-indigo-500" /> ResearchReel
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <footer className="py-6 text-center text-xs text-zinc-600 space-x-4">
        <Link href="/support" className="hover:text-zinc-400">Help</Link>
        <Link href="/support#terms" className="hover:text-zinc-400">Terms</Link>
        <Link href="/support#privacy" className="hover:text-zinc-400">Privacy</Link>
      </footer>
    </div>
  );
}
