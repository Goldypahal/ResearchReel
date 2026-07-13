"use client";

import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import { Mic, FileImage, Type } from 'lucide-react';

export default function SceneScriptPanel() {
  return (
    <GlassCard className="h-full flex flex-col gap-4 overflow-hidden" hoverEffect={false}>
       <div className="border-b border-white/10 pb-4">
         <h2 className="text-lg font-black tracking-tight text-white">Scene Script</h2>
         <p className="text-xs text-zinc-500 mt-1">Design slides and generate voiceovers.</p>
       </div>

       <div className="flex-1 overflow-y-auto space-y-6 pr-2">
         {/* Scene 1 Mock */}
         <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-white/5">
           <div className="flex justify-between items-center">
             <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Scene 1</span>
             <span className="text-xs font-mono text-zinc-500">0:00 - 0:10</span>
           </div>
           
           <div className="space-y-2">
             <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2">
               <FileImage size={12} /> Visual Asset
             </label>
             <div className="w-full h-24 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-xs text-zinc-500 hover:border-indigo-500/50 hover:text-indigo-400 transition cursor-pointer bg-white/5">
               Drop Image / Chart here
             </div>
           </div>

           <div className="space-y-2">
             <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2">
               <Type size={12} /> Narration Script (TTS)
             </label>
             <textarea 
               className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-sm text-zinc-300 resize-none h-24 focus:outline-none focus:border-indigo-500 transition"
               placeholder="Write what the AI should say..."
               defaultValue="Recent advancements in superconductivity have shown promising results at higher temperatures."
             />
           </div>

           <div className="flex justify-between items-center pt-2">
              <select className="bg-black/60 border border-white/10 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none">
                 <option>Voice: US Male (Marcus)</option>
                 <option>Voice: UK Female (Sarah)</option>
              </select>
              <Button size="sm" variant="secondary" className="gap-2">
                 <Mic size={14} /> Generate
              </Button>
           </div>
         </div>
         
         <Button variant="outline" className="w-full border-dashed">
            + Add Scene
         </Button>
       </div>
    </GlassCard>
  );
}
