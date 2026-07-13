"use client";

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Feed from '@/components/feed/Feed';
import { useAuth } from '@/context/AuthContext';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import { SCIENTISTS } from '@/lib/scientists';
import CreateStoryModal from '@/components/social/CreateStoryModal';
import StoryViewerModal from '@/components/social/StoryViewerModal';
import SwitchProfileModal from '@/components/social/SwitchProfileModal';
import SettingsModal from '@/components/social/SettingsModal';
import { useSocial } from '@/context/SocialContext';

export default function Home() {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const {
    isCreateStoryOpen,
    setIsCreateStoryOpen,
    isStoryViewerOpen,
    setIsStoryViewerOpen,
    isSwitchOpen,
    setIsSwitchOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    activeStoryIndex,
    setActiveStoryIndex
  } = useSocial();

  // Use a subset of scientists for stories
  const storyScientists = SCIENTISTS.slice(0, 10);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      handleScroll();
    }
    return () => el?.removeEventListener('scroll', handleScroll);
  }, []);

  // Format suggested users with realistic usernames and metadata
  const suggestedUsers = SCIENTISTS.slice(10, 15).map((s, idx) => {
    const username = s.name.toLowerCase().replace(/ /g, '_');
    const descriptions = [
      "Followed by @the_einstein + 3 more",
      "Suggested for you",
      "Followed by @m_curie",
      "Suggested for you",
      "Followed by @a_turing"
    ];
    return {
      ...s,
      username,
      description: descriptions[idx % descriptions.length]
    };
  });

  const currentUsername = user?.username 
    ? (user.username.startsWith('@') ? user.username.slice(1) : user.username) 
    : 'researcher_id';

  return (
    <div className="w-full flex justify-center bg-[var(--background)] min-h-screen text-[var(--foreground)] transition-colors duration-500 selection:bg-indigo-500/30">
      {/* Main Content Area */}
      <main className="w-full max-w-[1080px] px-4 pt-6 pb-20 grid grid-cols-1 lg:grid-cols-[600px_300px] gap-12 justify-center">
        
        {/* Left Column: Stories + Feed */}
        <section className="flex flex-col w-full max-w-[600px] mx-auto lg:mx-0 lg:relative lg:-left-[75px]">
          
          {/* Stories Section */}
          <div className="w-full mb-8 relative group">
            {showLeftArrow && (
              <button 
                onClick={() => scroll('left')}
                className="absolute left-2 top-8 z-10 w-8 h-8 bg-[var(--background)]/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl hover:bg-[var(--background)] transition-all border border-[var(--border)]/10 text-[var(--foreground)]"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            
            {showRightArrow && (
              <button 
                onClick={() => scroll('right')}
                className="absolute right-2 top-8 z-10 w-8 h-8 bg-[var(--background)]/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl hover:bg-[var(--background)] transition-all border border-[var(--border)]/10 text-[var(--foreground)]"
              >
                <ChevronRight size={18} />
              </button>
            )}

            <div 
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-4 no-scrollbar items-center px-0 scroll-smooth"
            >
              {/* Add Story Button */}
              <div className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group/story" onClick={() => setIsCreateStoryOpen(true)}>
                <div className="w-14 h-14 rounded-full relative">
                  <div className="w-full h-full rounded-full bg-[var(--foreground)]/5 border border-[var(--border)]/10 overflow-hidden flex items-center justify-center text-lg font-bold text-indigo-500/40">
                    {user?.full_name?.slice(0,1) || 'U'}
                  </div>
                  <div className="absolute bottom-0 right-0 bg-[#0095f6] rounded-full w-4.5 h-4.5 flex items-center justify-center border-2 border-[var(--background)] shadow-md">
                     <Plus size={10} className="text-white" strokeWidth={3} />
                  </div>
                </div>
                <span className="text-[11px] text-zinc-500 group-hover/story:text-indigo-500 transition-colors">Your story</span>
              </div>
              
              {/* Story Items (Using Famous Scientists) */}
              {storyScientists.map((s, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0 group/story"
                  onClick={() => {
                    setActiveStoryIndex(i);
                    setIsStoryViewerOpen(true);
                  }}
                >
                  <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-sm transition-transform group-hover/story:scale-105">
                    <div className="w-full h-full rounded-full bg-[var(--background)] p-[1.5px]">
                      <Image src={s.image} alt={s.name} width={56} height={56} className="w-full h-full rounded-full object-cover border border-[var(--border)]/5 shadow-inner" />
                    </div>
                  </div>
                  <span className="text-[11px] text-[var(--foreground)] opacity-80 group-hover/story:opacity-100 group-hover/story:text-indigo-500 transition-all truncate w-14 text-center">
                    {s.name.split(' ')[s.name.split(' ').length - 1].toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <Feed />
        </section>

        {/* Right Column: Suggestions Sidebar */}
        <aside className="hidden lg:block sticky top-8 h-fit mt-4 lg:relative lg:left-[38px]">
          
          {/* User Profile Summary */}
          <div className="flex items-center justify-between mb-6 group">
            <div className="flex items-center gap-3.5 cursor-pointer">
              <div className="w-11 h-11 rounded-full bg-[var(--foreground)]/5 border border-[var(--border)]/10 overflow-hidden flex items-center justify-center text-lg font-bold text-indigo-500/30 shadow-inner">
                {user?.full_name?.slice(0,1) || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight lowercase text-[var(--foreground)]">{currentUsername}</span>
                <span className="text-xs text-zinc-500">{user?.full_name || 'Dr. John Doe'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="text-[#0095f6] hover:text-[#1877f2] text-xs font-bold transition-colors bg-transparent border-none p-0 cursor-pointer" onClick={() => setIsSwitchOpen(true)}>
                Switch
              </button>
              <button className="text-[#0095f6] hover:text-[#1877f2] text-xs font-bold transition-colors bg-transparent border-none p-0 cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
                Settings
              </button>
            </div>
          </div>

          {/* Suggestions Header */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-zinc-500">Suggested for you</span>
            <button className="text-xs font-bold text-[var(--foreground)] hover:opacity-75 transition-opacity">See All</button>
          </div>

          {/* Suggested Users */}
          <div className="space-y-4">
            {suggestedUsers.map(s => (
              <div key={s.name} className="flex justify-between items-center group/suggest">
                <div className="flex items-center gap-3.5 cursor-pointer">
                  <div className="relative w-8 h-8">
                    <Image src={s.image} alt={s.name} width={32} height={32} className="w-8 h-8 rounded-full object-cover border border-[var(--border)]/10 shadow-sm" />
                    <div className="absolute inset-0 rounded-full bg-indigo-500/5 opacity-0 group-hover/suggest:opacity-100 transition-opacity"></div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-xs tracking-tight lowercase text-[var(--foreground)] hover:underline truncate w-40">{s.username}</span>
                    <span className="text-[10px] text-zinc-500 truncate w-40 leading-snug">{s.description}</span>
                  </div>
                </div>
                <button className="text-[#0095f6] hover:text-[#1877f2] text-xs font-bold transition-all active:scale-95 bg-transparent border-none p-0 cursor-pointer">Follow</button>
              </div>
            ))}
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-[10px] text-zinc-500 leading-loose">
            <div className="flex flex-wrap gap-x-2.5 mb-3 opacity-60">
              <a href="#" className="hover:underline transition-all">About</a>
              <a href="#" className="hover:underline transition-all">Help</a>
              <a href="#" className="hover:underline transition-all">Press</a>
              <a href="#" className="hover:underline transition-all">API</a>
              <a href="#" className="hover:underline transition-all">Jobs</a>
              <a href="#" className="hover:underline transition-all">Privacy</a>
              <a href="#" className="hover:underline transition-all">Terms</a>
              <a href="#" className="hover:underline transition-all">Locations</a>
              <a href="#" className="hover:underline transition-all">Language</a>
              <a href="#" className="hover:underline transition-all">Meta Verified</a>
            </div>
            <span className="text-zinc-500 font-medium uppercase tracking-[0.05em]">© 2026 RESEARCHREEL FROM ANTIGRAVITY</span>
          </div>
        </aside>
      </main>

      {/* Story Creation Modal */}
      {isCreateStoryOpen && <CreateStoryModal />}

      {/* Story Viewer Modal */}
      {isStoryViewerOpen && <StoryViewerModal />}

      {/* Switch Profile Modal */}
      {isSwitchOpen && <SwitchProfileModal />}

      {/* Settings Modal */}
      {isSettingsOpen && <SettingsModal />}
    </div>
  );
}
