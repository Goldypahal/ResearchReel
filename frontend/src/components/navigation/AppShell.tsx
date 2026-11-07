"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import CreationSheet from '../ui/CreationSheet';
import UploadPaperModal from '../ui/UploadPaperModal';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Avatar, Spinner } from '@/components/common';
import { Search, Bell, Library, Plus, MessageCircle } from 'lucide-react';

import { isStandaloneRoute, requiresAuth as routeRequiresAuth } from '@/lib/routes';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isCreationOpen, setIsCreationOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isLoading } = useAuth();
  const { unreadNotifications, unreadMessages } = useRealtime();
  const router = useRouter();
  const pathname = usePathname() || '/';

  const standalone = isStandaloneRoute(pathname);
  const requiresAuth = routeRequiresAuth(pathname);

  useEffect(() => {
    if (!isLoading && !user && requiresAuth) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, requiresAuth, pathname, router]);

  useKeyboardShortcuts({
    onOpenSearch: () => {
      const searchInput = document.getElementById('global-search-input');
      if (searchInput) searchInput.focus();
      else router.push('/search');
    },
    onOpenCreate: () => setIsCreationOpen(true),
    onOpenAskAI: () => router.push('/ai/ask'),
    onOpenUpload: () => setIsUploadOpen(true),
    onCloseModal: () => {
      setIsCreationOpen(false);
      setIsUploadOpen(false);
    }
  });

  if (standalone) return <>{children}</>;

  if (requiresAuth && (isLoading || !user)) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col md:flex-row">
      {user && <Sidebar onOpenCreate={() => setIsCreationOpen(true)} />}

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${user ? 'md:pl-[72px]' : ''}`}>
        <header className="sticky top-0 z-30 h-16 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:hidden">
            <Link href="/home" className="flex items-center gap-2">
              <Library size={22} className="text-indigo-500 shrink-0" />
              <span className="font-bold text-lg tracking-tight">ResearchReel</span>
            </Link>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg relative hidden sm:block" role="search">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="global-search-input"
              type="search"
              aria-label="Search"
              placeholder="Search people, papers, posts, reels or #tags  ( / )"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--foreground)]/5 border border-[var(--border)] rounded-full focus:outline-none focus:border-indigo-500/50 transition-all text-[var(--foreground)] placeholder:text-zinc-500"
            />
          </form>

          {user && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setIsCreationOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-semibold shadow-md transition-colors"
              >
                <Plus size={14} />
                <span>Create</span>
              </button>
              <Link href="/search" className="sm:hidden p-2 rounded-full hover:bg-[var(--foreground)]/5" aria-label="Search"><Search size={20} /></Link>
              <Link href="/messages" className="md:hidden p-2 rounded-full hover:bg-[var(--foreground)]/5 relative" aria-label={`Messages${unreadMessages ? `, ${unreadMessages} unread` : ''}`}>
                <MessageCircle size={20} />
                {unreadMessages > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">{unreadMessages > 9 ? '9+' : unreadMessages}</span>}
              </Link>
              <Link href="/notifications" className="p-2 rounded-full hover:bg-[var(--foreground)]/5 relative" aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}>
                <Bell size={20} />
                {unreadNotifications > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
              </Link>
              <Link href={`/profile/${user.username}`} aria-label="Your profile" className="hover:scale-105 transition-transform">
                <Avatar src={user.avatar_url} name={user.full_name} size={32} />
              </Link>
            </div>
          )}
          {!user && (
            <div className="ml-auto flex gap-2">
              <Link href="/auth/login" className="text-sm font-semibold px-3 py-1.5">Sign in</Link>
              <Link href="/auth/register" className="text-sm font-semibold px-3 py-1.5 rounded-full bg-indigo-600 text-white">Join</Link>
            </div>
          )}
        </header>

        <main className="flex-1 pb-20 md:pb-6 px-4 md:px-8 py-6 min-w-0">{children}</main>
      </div>

      {user && <MobileNav onOpenCreate={() => setIsCreationOpen(true)} />}
      {user && (
        <>
          <CreationSheet isOpen={isCreationOpen} onClose={() => setIsCreationOpen(false)} onOpenUploadModal={() => setIsUploadOpen(true)} />
          <UploadPaperModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
        </>
      )}
    </div>
  );
}
