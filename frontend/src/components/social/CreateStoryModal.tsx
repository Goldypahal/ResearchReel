"use client";

import React, { useState } from 'react';
import { X, Send, Palette } from 'lucide-react';
import { useSocial } from '@/context/SocialContext';

const GRADIENTS = [
  { id: 'grad-1', class: 'from-indigo-600 via-purple-600 to-pink-600', name: 'Neuro-Transcend' },
  { id: 'grad-2', class: 'from-blue-600 to-emerald-500', name: 'Quantum Leap' },
  { id: 'grad-3', class: 'from-orange-500 via-red-500 to-rose-600', name: 'Laser Fusion' },
  { id: 'grad-4', class: 'from-purple-800 via-violet-900 to-indigo-950', name: 'Deep Space' },
  { id: 'grad-5', class: 'from-zinc-900 via-teal-900 to-slate-900', name: 'Bio-Microscopy' }
];

export default function CreateStoryModal() {
  const { isCreateStoryOpen, setIsCreateStoryOpen, addCustomStory } = useSocial();
  const [text, setText] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0].class);

  if (!isCreateStoryOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    addCustomStory(text.trim(), selectedGradient);
    setText('');
    setIsCreateStoryOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-all duration-300 animate-in fade-in">
      <div className="relative w-full max-w-[650px] bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row transition-all scale-in duration-300">
        
        {/* Close Button */}
        <button 
          onClick={() => setIsCreateStoryOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 transition-all z-20"
        >
          <X size={18} />
        </button>

        {/* Preview Panel */}
        <div className="w-full md:w-72 bg-zinc-900 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-[var(--border)]/10 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Live Preview</span>
          
          <div className="w-[190px] h-[320px] rounded-2xl shadow-2xl relative overflow-hidden flex flex-col justify-between p-4 bg-zinc-950 border border-zinc-800">
            {/* Story Gradient BG */}
            <div className={`absolute inset-0 bg-gradient-to-tr ${selectedGradient} opacity-90`} />
            
            {/* Overlay cyber patterns */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/30 pointer-events-none" />

            {/* Header info */}
            <div className="relative z-10 flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-white/20 border border-white/20 flex items-center justify-center text-[9px] font-bold text-white italic">
                J
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-white leading-tight">Your Story</span>
                <span className="text-[7px] text-white/60">Just now</span>
              </div>
            </div>

            {/* Content text */}
            <div className="relative z-10 flex-1 flex items-center justify-center text-center px-1">
              <p className="text-white text-xs font-black tracking-tight leading-snug drop-shadow-md break-words max-w-full">
                {text || "Type your latest scholarly insight, formula, or quote..."}
              </p>
            </div>

            {/* Footer */}
            <div className="relative z-10 border-t border-white/10 pt-2 text-center">
              <span className="text-[7px] font-bold text-white/60 tracking-wider uppercase">ResearchReel Stories</span>
            </div>
          </div>
        </div>

        {/* Config Panel */}
        <div className="flex-1 p-6 flex flex-col justify-between mt-4 md:mt-0">
          <form onSubmit={handleSubmit} className="flex-grow flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">Add Scholarly Story</h3>
                <p className="text-xs text-zinc-500 font-medium">Broadcast a quick thought, citation, or formula to your followers.</p>
              </div>

              {/* Text Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Story Text</label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value.slice(0, 150))}
                  placeholder="e.g. Just verified the Quantum circuit simulation. 99.4% logic consistency reached! 🚀"
                  rows={4}
                  className="w-full bg-[var(--foreground)]/[0.03] border border-[var(--border)]/20 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  required
                />
                <div className="flex justify-end text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                  {text.length}/150 chars
                </div>
              </div>

              {/* Gradient Selector */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  <Palette size={12} />
                  <span>Choose Palette</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {GRADIENTS.map((grad) => (
                    <button
                      key={grad.id}
                      type="button"
                      onClick={() => setSelectedGradient(grad.class)}
                      title={grad.name}
                      className={`h-8 rounded-lg bg-gradient-to-tr ${grad.class} border-2 transition-all ${
                        selectedGradient === grad.class 
                          ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-500/20' 
                          : 'border-transparent hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)]/5 flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setIsCreateStoryOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-[var(--border)]/10 text-[10px] font-black uppercase tracking-widest hover:bg-[var(--foreground)]/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider text-[10px] px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95"
              >
                <Send size={12} />
                <span>Share Story</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
