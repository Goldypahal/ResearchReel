"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Home, Compass, PlusCircle, PlaySquare, User } from 'lucide-react';

interface MobileNavProps {
  onOpenCreate: () => void;
}

export default function MobileNav({ onOpenCreate }: MobileNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const profileHref = user?.username ? `/profile/${user.username}` : '/settings';

  const items = [
    { name: 'Home', href: '/home', icon: Home },
    { name: 'Discover', href: '/discover', icon: Compass },
    { name: 'Create', href: '#create', icon: PlusCircle, isCreate: true },
    { name: 'Reels', href: '/reels', icon: PlaySquare },
    { name: 'Profile', href: profileHref, icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-xl z-40 flex items-center justify-around px-2">
      {items.map((item) => {
        const isActive = pathname === item.href || (item.name === 'Profile' && pathname?.startsWith('/profile'));
        const Icon = item.icon;

        if (item.isCreate) {
          return (
            <button
              key={item.name}
              onClick={onOpenCreate}
              className="flex flex-col items-center justify-center p-2 text-indigo-500 hover:scale-105 transition-transform"
              aria-label="Create item"
            >
              <Icon size={26} strokeWidth={2.5} />
              <span className="text-[10px] font-bold mt-0.5">Create</span>
            </button>
          );
        }

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center p-2 transition-colors ${
              isActive ? 'text-indigo-500 font-bold' : 'text-muted-foreground hover:text-[var(--foreground)]'
            }`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] mt-0.5">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
