"use client";

import React, { useRef } from 'react';
import { useEditor, Track } from '@/context/EditorContext';
import GlassCard from '@/components/ui/GlassCard';

export default function Timeline() {
  const { state, dispatch } = useEditor();
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * state.duration;
    dispatch({ type: 'SET_TIME', payload: Math.max(0, Math.min(newTime, state.duration)) });
  };

  const renderTrack = (track: Track) => {
    return (
      <div key={track.id} className="flex items-center h-16 border-b border-white/5 group">
        <div className="w-24 shrink-0 px-4 flex items-center bg-black/40 h-full border-r border-white/5">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{track.type}</span>
        </div>
        <div className="flex-1 relative h-full bg-black/20 overflow-hidden cursor-crosshair">
          {/* Clips would map here. Using a mock representation for now. */}
          {track.type === 'video' && (
             <div className="absolute top-2 bottom-2 left-[10%] w-[40%] bg-blue-500/30 border border-blue-500/50 rounded-md shadow-inner flex items-center px-2 text-xs font-semibold text-blue-200">
               Slide 1
             </div>
          )}
          {track.type === 'audio' && (
             <div className="absolute top-2 bottom-2 left-[10%] w-[30%] bg-emerald-500/30 border border-emerald-500/50 rounded-md shadow-inner flex items-center px-2 text-xs font-semibold text-emerald-200">
               TTS: Voice
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <GlassCard className="w-full flex flex-col overflow-hidden" hoverEffect={false}>
      
      {/* Tools Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/20">
        <span className="text-xs font-black uppercase text-zinc-500 tracking-[0.2em]">Timeline</span>
        <span className="text-xs text-zinc-400 font-mono">{state.currentTime.toFixed(2)} / {state.duration}s</span>
      </div>

      {/* Ruler */}
      <div 
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="h-8 bg-black/60 border-b border-white/10 relative cursor-text select-none"
      >
         <div className="absolute top-0 bottom-0 left-0 right-0 flex justify-between px-[96px]">
           {[0, 10, 20, 30, 40, 50, 60].map(t => (
             <span key={t} className="text-[10px] text-zinc-600 mt-4 relative -left-2">{t}s</span>
           ))}
         </div>
         {/* Playhead */}
         <div 
           className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-50 pointer-events-none"
           style={{ left: `calc(96px + (${(state.currentTime / state.duration) * 100}% - (96px * ${state.currentTime / state.duration})))` }} // Rough math to adjust for sidebar width
         >
            <div className="w-3 h-3 bg-red-500 rounded-full absolute -top-1 -translate-x-[5px]" />
         </div>
      </div>

      {/* Tracks */}
      <div className="flex-1 overflow-y-auto">
        {state.tracks.map(renderTrack)}
      </div>

    </GlassCard>
  );
}
