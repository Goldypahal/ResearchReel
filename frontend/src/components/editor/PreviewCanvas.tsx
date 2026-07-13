"use client";

import React, { useEffect, useRef } from 'react';
import { useEditor } from '@/context/EditorContext';
import { Play, Pause, SkipBack } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

export default function PreviewCanvas() {
  const { state, dispatch } = useEditor();
  const reqRef = useRef<number>(null);

  // Playback Loop
  useEffect(() => {
    let lastTime = performance.now();
    
    const updateTime = (time: number) => {
      if (state.isPlaying) {
        const delta = (time - lastTime) / 1000; // seconds
        let newTime = state.currentTime + delta;
        
        if (newTime >= state.duration) {
          newTime = 0;
          dispatch({ type: 'TOGGLE_PLAY' }); // Pause at end
        }
        
        dispatch({ type: 'SET_TIME', payload: newTime });
      }
      lastTime = time;
      reqRef.current = requestAnimationFrame(updateTime);
    };

    if (state.isPlaying) {
      reqRef.current = requestAnimationFrame(updateTime);
    }

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [state.isPlaying, state.currentTime, state.duration, dispatch]);

  return (
    <GlassCard className="flex flex-col items-center justify-center h-full gap-4">
      <div className="w-[300px] h-[533px] bg-black rounded-xl overflow-hidden relative shadow-2xl border border-white/10 flex flex-col">
        {/* Placeholder for WebGL/Video content */}
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
           <span className="text-zinc-600 font-bold uppercase tracking-widest text-sm">Preview Canvas</span>
           <span className="text-white text-3xl font-black">{state.currentTime.toFixed(1)}s</span>
        </div>
        
        {/* Subtitle Overlay Mock */}
        <div className="absolute bottom-16 w-full px-4 text-center">
           <span className="bg-black/60 text-white font-bold px-2 py-1 rounded shadow-lg">
             Sample Generated Subtitle
           </span>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <button 
          onClick={() => dispatch({ type: 'SET_TIME', payload: 0 })}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition text-zinc-300"
        >
          <SkipBack size={20} />
        </button>
        <button 
          onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}
          className="p-4 rounded-full bg-indigo-600 hover:bg-indigo-500 transition text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]"
        >
          {state.isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
      </div>
    </GlassCard>
  );
}
