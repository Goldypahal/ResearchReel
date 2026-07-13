"use client";

import React from 'react';

interface ReelOverlayProps {
  reel: {
    author_name: string;
    author_username: string;
    title: string;
    description: string;
    tags: string[];
    verification_status?: string;
  };
  isMuted: boolean;
  onToggleMute: () => void;
}

export default function ReelOverlay({ reel, isMuted, onToggleMute }: ReelOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-6 bg-gradient-to-t from-[var(--background)]/90 via-[var(--background)]/20 to-transparent">
      
      {/* Top Banner (Optional for context) */}
      <div className="absolute top-6 left-6 pointer-events-auto">
        <button 
          onClick={onToggleMute}
          className="w-10 h-10 bg-[var(--background)]/40 backdrop-blur-md rounded-full flex items-center justify-center text-xl hover:bg-[var(--background)]/60 transition-all border border-[var(--border)]/20 shadow-lg"
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      <div className="flex h-full w-full items-end justify-between gap-6 pb-4">
        
        {/* Left Side: Information Panel (Section 3.3.2) */}
        <div className="flex-1 space-y-4 pointer-events-auto">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/20 flex items-center justify-center font-bold text-white shadow-xl group-hover:scale-105 transition-transform">
               {reel.author_name.slice(0,1)}
            </div>
            <div className="flex flex-col">
               <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[var(--foreground)] text-base shadow-sm">{reel.author_name}</span>
                  {reel.verification_status === 'scholar' && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Scholar</span>}
               </div>
               <span className="text-xs text-[var(--foreground)]/60 font-bold tracking-tight">{reel.author_username}</span>
            </div>
          </div>
          
          <div className="space-y-2">
             <h3 className="text-xl font-black text-[var(--foreground)] leading-tight underline decoration-indigo-500 decoration-2 underline-offset-4">{reel.title}</h3>
             <p className="text-sm text-[var(--foreground)]/70 leading-relaxed max-w-[85%] line-clamp-2 md:line-clamp-none italic font-medium">{reel.description}</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
             {reel.tags.map(tag => (
               <span key={tag} className="text-[11px] font-black uppercase tracking-widest px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-white border border-white/5 hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-colors cursor-pointer">#{tag}</span>
             ))}
          </div>

          {/* Interactive Timestamps (Section 3.3.2) */}
          <div className="flex gap-4 pt-1 overflow-x-auto no-scrollbar pb-2">
             <div className="flex flex-col gap-1 items-center bg-black/40 p-2 rounded-xl border border-indigo-500/20 cursor-pointer min-w-[70px]">
                <span className="text-[10px] font-bold text-indigo-400">0:12</span>
                <span className="text-[9px] font-bold text-white uppercase tracking-widest">Methods</span>
             </div>
             <div className="flex flex-col gap-1 items-center bg-black/40 p-2 rounded-xl border border-white/5 cursor-pointer min-w-[70px]">
                <span className="text-[10px] font-bold text-zinc-500">0:45</span>
                <span className="text-[9px] font-bold text-white uppercase tracking-widest">Equation</span>
             </div>
          </div>
        </div>

        {/* Right Side: Action Vertical Stack (Section 3.3.2) */}
        <div className="flex flex-col items-center gap-6 pointer-events-auto pb-4">
           
           <div className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="w-14 h-14 bg-zinc-900/60 backdrop-blur-3xl rounded-[20px] flex items-center justify-center text-2xl border border-white/10 group-hover:scale-110 active:scale-95 transition-all shadow-xl hover:border-indigo-500/40">🤔</div>
              <span className="text-[11px] font-black text-white uppercase tracking-widest drop-shadow-lg">1.2k</span>
           </div>

           <div className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="w-14 h-14 bg-zinc-900/60 backdrop-blur-3xl rounded-[20px] flex items-center justify-center text-2xl border border-white/10 group-hover:scale-110 active:scale-95 transition-all shadow-xl hover:border-purple-500/40">💬</div>
              <span className="text-[11px] font-black text-white uppercase tracking-widest drop-shadow-lg">84</span>
           </div>

           <div className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="w-14 h-14 bg-zinc-900/60 backdrop-blur-3xl rounded-[20px] flex items-center justify-center text-2xl border border-white/10 group-hover:scale-110 active:scale-95 transition-all shadow-xl hover:border-blue-500/40">📤</div>
           </div>

           <div className="flex flex-col items-center gap-1 group cursor-pointer">
              <div className="w-14 h-14 bg-indigo-600/20 backdrop-blur-3xl rounded-[20px] flex items-center justify-center text-2xl border border-indigo-500/30 group-hover:scale-110 active:scale-95 transition-all shadow-xl hover:bg-indigo-600/40 group-hover:border-indigo-500/60">📄</div>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] pt-1">Paper</span>
           </div>

           <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 p-1 mt-4 overflow-hidden shadow-2xl border border-white/10 animate-[spin_10s_linear_infinite] cursor-pointer">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-900 flex items-center justify-center text-[10px] font-bold">Lab</div>
           </div>

        </div>

      </div>
    </div>
  );
}
