"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusSquare, BookOpen, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { id: 'nav-home', icon: Home, path: '/home', label: 'Home' },
    { id: 'nav-explore', icon: Search, path: '/explore', label: 'Explore' },
    { id: 'nav-create', icon: PlusSquare, path: '/create', label: 'Create' },
    { id: 'nav-lectures', icon: BookOpen, path: '/lectures', label: 'Lectures' },
    { id: 'nav-profile', icon: User, path: '/profile', label: 'Profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 w-full h-12 bg-[var(--background)] border-t border-[var(--border)]/10 flex items-center justify-around z-50 px-2 pb-1 text-[var(--foreground)]">
      {navItems.map((item) => {
        const isActive = pathname === item.path || (item.path === '/profile' && pathname?.startsWith('/profile'));
        const Icon = item.icon;
        return (
          <Link 
            key={item.path} 
            href={item.path}
            id={item.id}
            aria-label={item.label}
            className="flex flex-col items-center justify-center p-2"
          >
            <div className="transition-transform active:scale-95">
              {item.label === 'Profile' ? (
                <div className={`w-6 h-6 rounded-full overflow-hidden border ${isActive ? 'border-white' : 'border-transparent'}`}>
                  <Image src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="Profile" width={24} height={24} className="w-full h-full object-cover" />
                </div>
              ) : (
                <Icon size={24} strokeWidth={isActive ? 3 : 2} className="text-[var(--foreground)]" />
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
