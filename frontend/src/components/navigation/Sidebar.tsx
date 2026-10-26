"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocial } from '@/context/SocialContext';
import { useTheme } from '@/context/ThemeContext';
import Avatar from '@/components/common/Avatar';
import { displayName } from '@/lib/utils';
import { 
  Home, Search, Compass, PlaySquare, MessageCircle, 
  Heart, PlusSquare, Menu,
  Bookmark, Sun, LogOut, Users, Moon, Library, User, Bot, Settings, LogIn,
  GraduationCap,
} from 'lucide-react';

interface SidebarProps {
  onOpenCreate?: () => void;
}

export default function Sidebar({ onOpenCreate }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadMessages, unreadNotifications } = useSocial();
  const { theme, setTheme } = useTheme();
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

  type NavItem = { name: string; href: string; icon: React.ElementType; isCreate?: boolean; isAvatar?: boolean; badge?: number };
  const navItems: NavItem[] = user
    ? [
        { name: 'Home', href: '/home', icon: Home },
        { name: 'Explore', href: '/explore', icon: Search },
        { name: 'Discover', href: '/discover', icon: Compass },
        { name: 'Library', href: '/library', icon: Bookmark },
        { name: 'AI Research', href: '/ai', icon: Bot },
        { name: 'Projects', href: '/projects', icon: Users },
        { name: 'Lectures', href: '/lectures', icon: GraduationCap },
        { name: 'Reels', href: '/reels', icon: PlaySquare },
        { name: 'Messages', href: '/messages', icon: MessageCircle, badge: unreadMessages },
        { name: 'Notifications', href: '/notifications', icon: Heart, badge: unreadNotifications },
        { name: 'Create', href: '#create', icon: PlusSquare, isCreate: true },
        { name: 'Profile', href: `/profile/${user.username}`, icon: User, isAvatar: true },
        { name: 'Settings', href: '/settings', icon: Settings },
      ]
    : [
        { name: 'Explore', href: '/explore', icon: Search },
        { name: 'Reels', href: '/reels', icon: PlaySquare },
        { name: 'Lectures', href: '/lectures', icon: GraduationCap },
        { name: 'Sign in', href: '/auth/login', icon: LogIn },
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
              className={`flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-[var(--foreground)]/5 transition-all group ${
                isExpanded ? 'justify-start' : 'justify-center'
              }`}
            >
              <div className={`relative transition-transform duration-200 group-hover:scale-105 ${isActive ? 'scale-105' : ''} shrink-0`}>
                {item.isAvatar ? (
                  <Avatar src={user?.avatar_url} name={displayName(user)} size="xs" ring={isActive} />
                ) : (
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-indigo-500 font-bold' : ''} />
                )}
                {item.badge ? (
                  <span className="absolute -right-2 -top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white" aria-label={`${item.badge} unread`}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
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
              {user && <><Link href="/saved" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-colors text-sm font-semibold text-[var(--foreground)]">
                <Bookmark size={18} />
                <span>Saved</span>
              </Link>
              <Link href="/reels/create" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--foreground)]/5 transition-colors text-sm font-semibold text-[var(--foreground)]">
                <PlaySquare size={18} className="text-indigo-500" />
                <span>Reel studio</span>
              </Link></>}
              
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
            {user && <div className="p-2">
              <button 
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors text-sm font-semibold text-red-500"
              >
                <LogOut size={18} />
                <span>Log out</span>
              </button>
            </div>}
          </div>
        )}
        
        <button 
          onClick={() => setIsMoreOpen(!isMoreOpen)}
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
