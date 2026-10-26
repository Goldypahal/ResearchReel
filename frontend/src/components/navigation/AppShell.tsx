"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import CreationSheet from '../ui/CreationSheet';
import UploadPaperModal from '../ui/UploadPaperModal';
import { useAuth } from '@/context/AuthContext';
import { useSocial } from '@/context/SocialContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import Avatar from '@/components/common/Avatar';
import { LoadingBlock } from '@/components/common/States';
import { displayName } from '@/lib/utils';
import { isStandaloneRoute, requiresAuth } from '@/lib/routes';
import { Search, Bell, Library, Plus, LogIn, MessageCircle } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isCreationOpen, setIsCreationOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isLoading } = useAuth();
  const { unreadNotifications, unreadMessages } = useSocial();
  const router = useRouter();
  const pathname = usePathname() || '/';

  // Register global keyboard shortcuts
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isStandalonePage = isStandaloneRoute(pathname);
  const needsAuth = requiresAuth(pathname);

  useEffect(() => {
    if (needsAuth && !isLoading && !user) {
      const next = window.location.pathname + window.location.search;
      router.replace(`/auth/login?next=${encodeURIComponent(next)}`);
    }
  }, [needsAuth, isLoading, user, router]);

  if (isStandalonePage) {
    return <>{children}</>;
  }
  if (needsAuth && !user) {
    return <div className="min-h-screen bg-[var(--background)]"><LoadingBlock className="pt-40" /></div>;
  }

  const profileHref = user?.username ? `/profile/${user.username}` : '/settings';

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col md:flex-row">
      {/* Desktop Persistent Sidebar */}
      <Sidebar onOpenCreate={() => setIsCreationOpen(true)} />

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col md:pl-[72px] min-w-0 transition-all duration-300">
        {/* Top Utility Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:hidden">
            <Link href="/home" className="flex items-center gap-2">
              <Library size={22} className="text-indigo-500 shrink-0" />
              <span className="font-bold text-lg tracking-tight">ResearchReel</span>
            </Link>
          </div>

          {/* Global Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg relative hidden sm:block">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="global-search-input"
              type="text"
              placeholder="Search research papers, topics, authors, reels... (Press '/' to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[var(--foreground)]/5 border border-[var(--border)] rounded-full focus:outline-none focus:border-indigo-500/50 transition-all text-[var(--foreground)] placeholder:text-muted-foreground"
            />
          </form>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-3 ml-auto">
            {user && <button
              onClick={() => setIsCreationOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-semibold shadow-md transition-colors"
            >
              <Plus size={14} />
              <span>Create</span>
            </button>}

            {user ? (
              <>
                <Link
                  href="/messages"
                  className="md:hidden p-2 rounded-full hover:bg-[var(--foreground)]/5 text-muted-foreground hover:text-[var(--foreground)] transition-colors relative"
                  aria-label={unreadMessages ? `Messages (${unreadMessages} unread)` : 'Messages'}
                >
                  <MessageCircle size={20} />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </Link>
                <Link
                  href="/notifications"
                  className="p-2 rounded-full hover:bg-[var(--foreground)]/5 text-muted-foreground hover:text-[var(--foreground)] transition-colors relative"
                  aria-label={unreadNotifications ? `Notifications (${unreadNotifications} unread)` : 'Notifications'}
                >
                  <Bell size={20} />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </Link>
                <Link href={profileHref} aria-label="Your profile" className="hover:opacity-90">
                  <Avatar src={user.avatar_url} name={displayName(user)} size="sm" />
                </Link>
              </>
            ) : (
              <Link
                href={`/auth/login?next=${encodeURIComponent(pathname)}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                <LogIn size={14} /> Sign in
              </Link>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 pb-20 md:pb-6 px-4 md:px-8 py-6 min-w-0">
          {children}
        </main>
      </div>

      {/* Persistent Mobile Bottom Navigation */}
      <MobileNav onOpenCreate={() => setIsCreationOpen(true)} />

      {/* Global Overlays */}
      <CreationSheet
        isOpen={isCreationOpen}
        onClose={() => setIsCreationOpen(false)}
        onOpenUploadModal={() => setIsUploadOpen(true)}
      />

      <UploadPaperModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </div>
  );
}
