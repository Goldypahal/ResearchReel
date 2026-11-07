"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRealtime } from '@/context/RealtimeContext';
import { Avatar } from '@/components/common';
import { 
  Home, Compass, PlaySquare, MessageCircle, 
  Heart, PlusSquare, Menu, FileText,
  Bookmark, Sun, LogOut, Users, Moon, Library, User, BookOpen, Bot, Settings, Shield, Trophy, Calendar
} from 'lucide-react';

interface SidebarProps {
  onOpenCreate?: () => void;
}

export default function Sidebar({ onOpenCreate }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { unreadNotifications, unreadMessages } = useRealtime();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const moreRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
    setIsMoreOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const navItems = [
    { name: 'Home', href: '/home', icon: Home, hint: 'G H' },
    { name: 'Discover', href: '/discover', icon: Compass, hint: 'G D' },
    { name: 'Library', href: '/library', icon: Bookmark, hint: 'G L' },
    { name: 'AI Research', href: '/ai', icon: Bot, hint: 'A' },
    { name: 'Projects', href: '/projects', icon: Users, hint: 'G P' },
    { name: 'Reels', href: '/reels', icon: PlaySquare, hint: 'G R' },
    { name: 'Messages', href: '/messages', icon: MessageCircle, hint: 'G M', badge: unreadMessages },
    { name: 'Notifications', href: '/notifications', icon: Heart, badge: unreadNotifications },
    { name: 'Lectures', href: '/lectures', icon: BookOpen },
    { name: 'Create', href: '#create', icon: PlusSquare, isCreate: true, hint: 'N' },
    { name: 'Profile', href: `/profile/${user?.username || ''}`, icon: User, isAvatar: true },
    { name: 'Settings', href: '/settings', icon: Settings },
    ...(user && (user.role === 'admin' || user.role === 'moderator') ? [{ name: 'Moderation', href: '/mod', icon: Shield }] : []),
  ];


  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`hidden md:flex flex-col h-screen fixed left-0 top-0 border-r border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-xl text-[var(--foreground)] px-3 py-6 z-50 transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-[244px] shadow-[10px_0_30px_rgba(0,0,0,0.4)]' : 'w-[72px]'
      }`}
    >
      {/* Logo */}
      <div className={`px-3 mb-8 pt-2 flex items-center ${isExpanded ? 'justify-start' : 'justify-center'}`}>
        <Link href="/home" className="flex items-center gap-3 group">
          <Library size={24} className="shrink-0 text-indigo-500" />
          <span 
            className={`font-bold text-xl tracking-tight hover:text-indigo-500 transition-all duration-300 ${
              isExpanded ? 'opacity-100 max-w-[200px] visible' : 'opacity-0 max-w-0 invisible overflow-hidden'
            }`} 
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            ResearchReel
          </span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.name === 'Profile' && pathname?.startsWith('/profile'));
          const Icon = item.icon;

          if (item.isCreate) {
            return (
              <button
                key={item.name}
                aria-label={item.name}
                onClick={() => onOpenCreate && onOpenCreate()}
                className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-[var(--foreground)]/5 transition-all group ${
                  isExpanded ? 'justify-start' : 'justify-center'
                }`}
              >
                <div className="relative transition-transform duration-200 group-hover:scale-105 shrink-0 text-indigo-500">
                  <Icon size={24} strokeWidth={2.5} />
                </div>
                <span 
                  className={`text-[15px] font-medium text-indigo-500 whitespace-nowrap transition-all duration-300 ${
                    isExpanded ? 'opacity-100 max-w-[200px] visible' : 'opacity-0 max-w-0 invisible overflow-hidden'
                  }`}
                >
                  {item.name}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.name}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-[var(--foreground)]/5 transition-all group ${
                isExpanded ? 'justify-start' : 'justify-center'
              }`}
            >
              <div className={`relative transition-transform duration-200 group-hover:scale-105 ${isActive ? 'scale-105' : ''} shrink-0`}>
                {item.isAvatar ? (
                  <Avatar src={user?.avatar_url} name={user?.full_name} size={24} className={isActive ? 'ring-2 ring-indigo-500' : ''} />
                ) : (
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-indigo-500 font-bold' : ''} />
                )}
                {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">{item.badge > 9 ? '9+' : item.badge}</span>
                )}
              </div>
              <span 
                className={`text-[15px] whitespace-nowrap transition-all duration-300 ${
                  isExpanded ? 'opacity-100 max-w-[200px] visible' : 'opacity-0 max-w-0 invisible overflow-hidden'
                } ${isActive ? 'font-bold tracking-tight text-indigo-500' : 'font-medium opacity-80'}`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>


      {/* Footer / More */}
      <div className="mt-auto pt-4 relative" ref={moreRef}>
        {isMoreOpen && (
          <div className="absolute bottom-16 left-0 w-64 bg-[var(--background)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)] animate-in fade-in slide-in-from-bottom-4 duration-200 z-[60] backdrop-blur-xl">
            <div className="p-2 border-b border-[var(--border)]">
              <Link href="/workspace" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-colors text-sm font-semibold text-[var(--foreground)]">
                <FileText size={18} />
                <span>My tasks</span>
              </Link>
              <Link href="/explore/conference" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-colors text-sm font-semibold text-[var(--foreground)]">
                <Calendar size={18} />
                <span>Conferences</span>
              </Link>
              <Link href="/leaderboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-colors text-sm font-semibold text-[var(--foreground)]">
                <Trophy size={18} />
                <span>Leaderboard</span>
              </Link>
              <Link href="/achievements" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-colors text-sm font-semibold text-[var(--foreground)]">
                <Trophy size={18} />
                <span>Achievements</span>
              </Link>
              <Link href="/saved" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-colors text-sm font-semibold text-[var(--foreground)]">
                <Bookmark size={18} />
                <span>Saved</span>
              </Link>
              <Link href="/reels/generator" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-colors text-sm font-semibold text-[var(--foreground)]">
                <PlaySquare size={18} className="text-indigo-500 animate-pulse" />
                <span>Reel Generator</span>
              </Link>
              
              {/* Appearance Submenu */}
              <div className="px-4 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mt-2 border-t border-[var(--border)]">Appearance</div>
              <div className="flex flex-col gap-0.5 p-1">
                 <button 
                   onClick={() => setTheme('white')} 
                   className={`flex items-center gap-3 w-full px-4 py-2 rounded-xl hover:bg-[var(--foreground)]/5 transition-colors text-sm font-semibold ${theme === 'white' ? 'bg-indigo-500/10 text-indigo-500' : ''}`}
                 >
                    <Sun size={18} /> 
                    <span>Light Mode</span>
                 </button>
                 <button 
                   onClick={() => setTheme('black')} 
                   className={`flex items-center gap-3 w-full px-4 py-2 rounded-xl hover:bg-[var(--foreground)]/5 transition-colors text-sm font-semibold ${theme === 'black' ? 'bg-indigo-500/10 text-indigo-500' : ''}`}
                 >
                    <Moon size={18} /> 
                    <span>Dark Mode</span>
                 </button>
              </div>
            </div>
            <div className="p-2">
              <button 
                onClick={() => { logout(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors text-sm font-semibold text-red-500"
              >
                <LogOut size={18} />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}
        
        <button 
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          aria-label="More"
          aria-expanded={isMoreOpen}
          className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-all group ${isMoreOpen ? 'bg-[var(--foreground)]/5' : ''} ${
            isExpanded ? 'justify-start' : 'justify-center'
          }`}
        >
          <Menu size={24} strokeWidth={isMoreOpen ? 3 : 2} className="group-hover:scale-105 transition-transform duration-200 shrink-0" />
          <span 
            className={`text-[15px] whitespace-nowrap transition-all duration-300 ${
              isExpanded ? 'opacity-100 max-w-[200px] visible' : 'opacity-0 max-w-0 invisible overflow-hidden'
            } ${isMoreOpen ? 'font-bold' : 'font-medium opacity-80'}`}
          >
            More
          </span>
        </button>
      </div>
    </div>
  );
}
