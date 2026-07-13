"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Heart, MessageCircle, Home, Search, Compass, PlaySquare, BookOpen, PlusSquare, User, FileText, Bookmark, Sun, Moon, Users, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isNotificationsActive = pathname === '/notifications';
  const isMessagesActive = pathname === '/messages';

  const navItems = [
    { name: 'Home', href: '/home', icon: Home },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Explore', href: '/explore', icon: Compass },
    { name: 'Reels', href: '/reels', icon: PlaySquare },
    { name: 'Lectures', href: '/lectures', icon: BookOpen },
    { name: 'Messages', href: '/messages', icon: MessageCircle },
    { name: 'Notifications', href: '/notifications', icon: Heart },
    { name: 'Create', href: '/create', icon: PlusSquare },
    { name: 'Profile', href: `/profile/${user?.username || 'julianewton'}`, icon: User, isAvatar: true },
  ];

  return (
    <>
      <nav className="fixed top-0 w-full z-50 border-b border-[var(--border)]/10 bg-[var(--background)]/85 backdrop-blur-md h-14 md:hidden px-4">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-[var(--foreground)] p-1 hover:text-indigo-500 transition-colors"
            >
              <Menu size={24} />
            </button>
            <Link href="/home" className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight italic bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>
                ResearchReel
              </span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/notifications"
              className="text-[var(--foreground)] hover:text-rose-500 transition-colors p-1"
              aria-label="Notifications"
            >
              <Heart 
                size={22} 
                strokeWidth={2} 
                fill={isNotificationsActive ? "currentColor" : "none"} 
                className={`transition-all active:scale-90 ${isNotificationsActive ? 'text-rose-500' : ''}`}
              />
            </Link>
            <Link 
              href="/messages"
              className="text-[var(--foreground)] hover:text-indigo-500 transition-colors p-1"
              aria-label="Messages"
            >
              <MessageCircle 
                size={22} 
                strokeWidth={2} 
                fill={isMessagesActive ? "currentColor" : "none"} 
                className={`transition-all active:scale-90 ${isMessagesActive ? 'text-indigo-500' : ''}`}
              />
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-[80%] max-w-sm h-full bg-[var(--background)] border-r border-[var(--border)]/20 shadow-2xl flex flex-col animate-slide-left">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]/10">
              <span className="font-bold text-lg tracking-tight italic bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                ResearchReel
              </span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-[var(--foreground)] hover:bg-[var(--foreground)]/5 rounded-full">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.name === 'Profile' && pathname?.startsWith('/profile'));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-[var(--foreground)]/5 font-bold' : 'hover:bg-[var(--foreground)]/5 font-medium opacity-80'}`}
                  >
                    {item.isAvatar ? (
                      <div className={`w-6 h-6 rounded-full bg-[var(--foreground)]/10 border flex items-center justify-center text-[10px] ${isActive ? 'border-indigo-500' : 'border-transparent'}`}>
                        {user?.full_name?.slice(0,1) || 'U'}
                      </div>
                    ) : (
                      <Icon size={22} className={isActive ? 'text-indigo-500' : ''} />
                    )}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              <div className="h-px bg-[var(--border)]/10 my-4" />
              
              <Link href="/editor" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-all opacity-80 font-medium">
                <FileText size={22} />
                <span>Editor</span>
              </Link>
              <Link href="/saved" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-all opacity-80 font-medium">
                <Bookmark size={22} />
                <span>Saved</span>
              </Link>
              <Link href="/reels/generator" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-all opacity-80 font-medium">
                <PlaySquare size={22} className="text-indigo-500" />
                <span>Reel Generator</span>
              </Link>

              <div className="h-px bg-[var(--border)]/10 my-4" />
              
              <div className="px-4 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Appearance</div>
              <button onClick={() => { setTheme('white'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 w-full px-4 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-all opacity-80 font-medium ${theme === 'white' ? 'text-indigo-500' : ''}`}>
                <Sun size={22} /> 
                <span>Light Mode</span>
              </button>
              <button onClick={() => { setTheme('black'); setIsMobileMenuOpen(false); }} className={`flex items-center gap-4 w-full px-4 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-all opacity-80 font-medium ${theme === 'black' ? 'text-indigo-500' : ''}`}>
                <Moon size={22} /> 
                <span>Dark Mode</span>
              </button>

              <div className="h-px bg-[var(--border)]/10 my-4" />

              <button onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 w-full px-4 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-all opacity-80 font-medium">
                <Users size={22} />
                <span>Switch accounts</span>
              </button>
              <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="flex items-center gap-4 w-full px-4 py-3 rounded-xl hover:bg-red-500/10 transition-all font-medium text-red-500">
                <LogOut size={22} />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
