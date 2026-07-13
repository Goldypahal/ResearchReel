"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/navigation/Sidebar';
import BottomNav from '@/components/navigation/BottomNav';
import Navbar from '@/components/navigation/Navbar';

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/' || pathname?.startsWith('/auth');

  if (isAuthPage) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="md:hidden">
        <Navbar />
      </div>
      <Sidebar />
      
      {/* Main content area pushed to the right on desktop */}
      <main className="flex-1 md:ml-[var(--sidebar-width)] min-h-screen w-full pt-16 md:pt-0 pb-16 md:pb-0 transition-[margin] duration-300">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
