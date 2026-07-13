"use client";

import React, { useRef, useState, useEffect } from 'react';
import ReelOverlay from './ReelOverlay';

interface ReelProps {
  id: string;
  author_name: string;
  author_id: string;
  author_username: string;
  video_url: string;
  title: string;
  description: string;
  tags: string[];
  paper_id?: string;
  verification_status?: string;
}

export default function ReelPlayer({ reel, isActive }: { reel: ReelProps, isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch(() => console.log("Auto-play blocked"));
      setTimeout(() => setIsPlaying(true), 0);
    } else if (videoRef.current) {
      videoRef.current.pause();
      setTimeout(() => setIsPlaying(false), 0);
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] md:h-[800px] md:w-[450px] mx-auto bg-[var(--background)] border border-[var(--border)]/20 rounded-none md:rounded-[40px] overflow-hidden snap-start shrink-0 select-none shadow-2xl transition-colors duration-500">
      
      {/* Video Element */}
      <video
        ref={videoRef}
        src={reel.video_url}
        className="w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        onClick={togglePlay}
      />

      {/* Play/Pause Large Pulse Indicator (Section 3.3.1) */}
      {!isPlaying && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none transition-opacity">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center text-4xl animate-pulse">▶️</div>
         </div>
      )}

      {/* Custom Overlay (Section 3.3.2) */}
      <ReelOverlay 
        reel={reel} 
        isMuted={isMuted} 
        onToggleMute={() => setIsMuted(!isMuted)} 
      />

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
         <div className="h-full bg-indigo-500 w-1/3 animate-[progress_30s_linear_infinite]"></div>
      </div>

    </div>
  );
}
