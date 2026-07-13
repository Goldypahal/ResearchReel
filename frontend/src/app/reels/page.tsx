"use client";

import React, { useState, useEffect, useRef } from 'react';
import ReelPlayer from '@/components/reels/ReelPlayer';

const MOCK_REELS = [
  {
    id: "v1",
    author_name: "Dr. Julia Newton",
    author_id: "u1",
    author_username: "@julianewton",
    video_url: "https://v.videomaker.app/v1.mp4", // Mocked URL
    title: "Neuro-Symbolic Integration",
    description: "Explaining how we bridged transformer performance with logical consistency using symbolic neural-symbolic networks.",
    tags: ["ArtificialIntelligence", "NeuroSymbolic", "Reasoning"],
    verification_status: "scholar"
  },
  {
    id: "v2",
    author_name: "Alex Thompson",
    author_id: "u2",
    author_username: "@athompson_cs",
    video_url: "https://v.videomaker.app/v2.mp4", // Mocked URL
    title: "Aberrant Diffraction Patterns",
    description: "Visualizing 405nm laser pulse diffraction on silicon metasurfaces in our cleanroom setup 🔬.",
    tags: ["Physics", "Metasurfaces", "Optics"],
    verification_status: "student"
  },
  {
    id: "v3",
    author_name: "Prof. Sarah Chen",
    author_id: "u3",
    author_username: "@sarah_chen_lab",
    video_url: "https://v.videomaker.app/v3.mp4", // Mocked URL
    title: "Cell Migration Dynamics",
    description: "Confocal microscopy time-lapse of cell movement in 3D scaffold environments.",
    tags: ["Biology", "Microscopy", "Genomics"],
    verification_status: "scholar"
  }
];

export default function ReelsPage() {
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const watchedSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('reels_watched_ids');
      if (stored) {
        try {
          const ids = JSON.parse(stored);
          if (Array.isArray(ids)) {
            ids.forEach(id => watchedSetRef.current.add(id));
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        const count = parseInt(localStorage.getItem('reels_watched_count') || '0', 10);
        for (let i = 0; i < count; i++) {
          watchedSetRef.current.add(`dummy-${i}`);
        }
      }
    }
  }, []);

  useEffect(() => {
    const currentReelId = MOCK_REELS[activeReelIndex]?.id;
    if (!currentReelId) return;

    if (!watchedSetRef.current.has(currentReelId)) {
      watchedSetRef.current.add(currentReelId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('reels_watched_ids', JSON.stringify(Array.from(watchedSetRef.current)));
        localStorage.setItem('reels_watched_count', watchedSetRef.current.size.toString());
        // Trigger a custom event to notify Feed of state change
        window.dispatchEvent(new Event('storage'));
      }
    }
  }, [activeReelIndex]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollPos = e.currentTarget.scrollTop;
    const itemHeight = e.currentTarget.clientHeight;
    // Calculate which reel is currently in view based on snap points
    const index = Math.round(scrollPos / itemHeight);
    if (index !== activeReelIndex && index >= 0 && index < MOCK_REELS.length) {
      setActiveReelIndex(index);
    }
  };

  return (
    <div className="h-[calc(100vh-128px)] md:h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden flex flex-col">
       <main className="flex-1 overflow-y-auto snap-y snap-mandatory touch-pan-y no-scrollbar md:p-10" onScroll={handleScroll}>
          <div className="max-w-7xl mx-auto flex flex-col items-center gap-10 md:gap-0 h-full">
             {MOCK_REELS.map((reel, index) => (
                <div key={reel.id} className="h-full w-full flex items-center justify-center shrink-0 snap-center pb-20 md:pb-0">
                   <ReelPlayer reel={reel} isActive={activeReelIndex === index} />
                </div>
             ))}
          </div>
       </main>

       {/* Floating UI: Back button shadow for mobile */}
       <div className="absolute top-20 left-6 pointer-events-auto md:hidden">
          <button className="text-[var(--foreground)] bg-[var(--background)]/40 p-2 rounded-full backdrop-blur-md border border-[var(--border)]/20 shadow-lg" onClick={() => window.history.back()}>
             ←
          </button>
       </div>
    </div>
  );
}
