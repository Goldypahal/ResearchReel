"use client";

import React, { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, AlertCircle } from 'lucide-react';
import { useSocial } from '@/context/SocialContext';
import Image from 'next/image';

const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryViewerModal() {
  const { 
    isStoryViewerOpen, 
    setIsStoryViewerOpen, 
    stories, 
    activeStoryIndex, 
    setActiveStoryIndex,
    markStoryViewed
  } = useSocial();

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(Date.now());
  const pausedTime = useRef<number>(0);

  const activeStory = stories[activeStoryIndex];

  // Reset progress & trigger view tracking when active story changes
  useEffect(() => {
    if (isStoryViewerOpen && activeStory) {
      setProgress(0);
      startTime.current = Date.now();
      pausedTime.current = 0;
      markStoryViewed(activeStory.id);
    }
  }, [activeStoryIndex, isStoryViewerOpen, activeStory, markStoryViewed]);

  // Handle timer ticks
  useEffect(() => {
    if (!isStoryViewerOpen || isPaused) {
      if (progressInterval.current) clearInterval(progressInterval.current);
      return;
    }

    const intervalTime = 50; // Update progress every 50ms
    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        const nextProgress = prev + (intervalTime / STORY_DURATION) * 100;
        if (nextProgress >= 100) {
          handleNext();
          return 0;
        }
        return nextProgress;
      });
    }, intervalTime);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isStoryViewerOpen, isPaused, activeStoryIndex, stories.length]);

  if (!isStoryViewerOpen || !activeStory) return null;

  const handlePrev = () => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    } else {
      setProgress(0);
      startTime.current = Date.now();
    }
  };

  const handleNext = () => {
    if (activeStoryIndex < stories.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      setIsStoryViewerOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 transition-all duration-300 animate-in fade-in">
      {/* Absolute Close Button */}
      <button 
        onClick={() => setIsStoryViewerOpen(false)}
        className="absolute top-6 right-6 p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all z-20"
      >
        <X size={24} />
      </button>

      {/* Navigation Controls (Desktop) */}
      {activeStoryIndex > 0 && (
        <button 
          onClick={handlePrev}
          className="absolute left-10 hidden md:flex w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 items-center justify-center text-white transition-all"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {activeStoryIndex < stories.length - 1 && (
        <button 
          onClick={handleNext}
          className="absolute right-10 hidden md:flex w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 items-center justify-center text-white transition-all"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Story Viewport Card */}
      <div 
        className="relative w-full max-w-[380px] h-[640px] rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between p-4 bg-zinc-950 border border-zinc-900 select-none"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Story Background */}
        {activeStory.isCustom ? (
          <div className={`absolute inset-0 bg-gradient-to-tr ${activeStory.gradient || 'from-indigo-600 to-purple-600'} opacity-90`} />
        ) : (
          <div className="absolute inset-0 bg-zinc-950 flex flex-col">
            {/* Blurry visualizer of the user image */}
            <div className="absolute inset-0 opacity-20 filter blur-3xl scale-125">
              <Image src={activeStory.image} alt={activeStory.name} fill className="object-cover" />
            </div>
            {/* Soft gradient bottom dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
          </div>
        )}

        {/* Floating background circuit pattern for high quality feel */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-black/40 pointer-events-none" />

        {/* Top Header Section */}
        <div className="relative z-10 space-y-3">
          {/* Progress Bars */}
          <div className="flex gap-1.5 w-full">
            {stories.map((s, idx) => {
              let barProgress = 0;
              if (idx < activeStoryIndex) barProgress = 100;
              if (idx === activeStoryIndex) barProgress = progress;

              return (
                <div key={s.id} className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all ease-linear rounded-full"
                    style={{ width: `${barProgress}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* User Meta Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeStory.isCustom ? (
                <div className="w-8 h-8 rounded-full bg-white/20 border border-white/20 flex items-center justify-center text-xs font-black text-white italic">
                  {activeStory.name.slice(0, 1)}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 overflow-hidden relative">
                  <Image src={activeStory.image} alt={activeStory.name} fill className="object-cover" />
                </div>
              )}
              
              <div className="flex flex-col">
                <span className="text-xs font-black text-white leading-tight flex items-center gap-1">
                  {activeStory.isCustom ? 'Your Story' : activeStory.name}
                  {!activeStory.isCustom && (
                    <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.2 rounded-full font-black uppercase scale-90">SCHOLAR</span>
                  )}
                </span>
                <span className="text-[9px] text-white/60 font-medium">{activeStory.timestamp}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsPaused(!isPaused); }}
                className="p-1 rounded-full text-white/70 hover:text-white transition-colors"
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Centered Main Story Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4">
          {activeStory.isCustom ? (
            <p className="text-white text-base font-black tracking-tight leading-snug drop-shadow-md break-words max-w-full">
              {activeStory.text}
            </p>
          ) : (
            <div className="w-full space-y-6">
              {/* Field pill */}
              <div className="inline-block bg-indigo-500/10 border border-indigo-500/25 px-3 py-1 rounded-full text-[9px] text-indigo-400 font-black uppercase tracking-widest">
                {activeStory.field}
              </div>

              {/* Quote Block */}
              <blockquote className="text-white text-sm font-bold italic tracking-tight leading-relaxed px-2 drop-shadow-sm">
                "{activeStory.quote}"
              </blockquote>

              {/* Scientist Pseudocode block */}
              {activeStory.pseudocode && (
                <div className="bg-black/55 border border-zinc-800/40 rounded-xl p-3 text-left font-mono text-[9px] text-zinc-300 w-full overflow-x-auto max-h-[160px] no-scrollbar">
                  <span className="text-indigo-400 font-bold">// Breakthrough Logic:</span>
                  <pre className="mt-1 leading-normal whitespace-pre-wrap">{activeStory.pseudocode}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info / Swipe Indicator */}
        <div className="relative z-10 border-t border-white/10 pt-3 text-center flex flex-col gap-2">
          {activeStory.isCustom ? (
            <span className="text-[8px] font-bold text-white/50 tracking-widest uppercase">Custom Shared Story</span>
          ) : (
            <div className="flex items-center justify-center gap-1.5 text-indigo-400">
              <AlertCircle size={10} />
              <span className="text-[8px] font-black uppercase tracking-wider">Tap & Hold to Pause Science</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
