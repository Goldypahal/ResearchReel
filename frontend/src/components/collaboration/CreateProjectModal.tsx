"use client";

import React from 'react';

export default function CreateProjectModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-fade-in" onClick={onClose}></div>
      
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[48px] p-12 shadow-2xl animate-slide-up overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/05 rounded-full blur-[100px] -z-0"></div>

         <div className="space-y-12 relative z-10">
            <div className="text-center space-y-3">
               <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] italic">Collaborate at Scale</span>
               <h2 className="text-4xl font-black tracking-tight text-white italic underline underline-offset-8 decoration-indigo-500">Initiate Research</h2>
            </div>

            <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Project Title</label>
                     <input 
                       type="text" 
                       placeholder="Neural-Symbolic Consistency in Large LLMs"
                       className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                       required
                    />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Collaborative Goal</label>
                     <textarea 
                       placeholder="Explain the broader impact of your research..."
                       className="w-full h-32 bg-white/5 border border-white/10 rounded-3xl px-6 py-4 text-sm font-medium text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                    />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Target Publication</label>
                     <select className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-xs font-bold text-white outline-none focus:border-indigo-500/50 transition-all">
                        <option>NeurIPS 2026</option>
                        <option>CVPR 2026</option>
                        <option>Journal of AI</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Privacy Tier</label>
                     <div className="flex gap-2 h-14">
                        <div className="flex-1 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-indigo-500 cursor-pointer">Closed</div>
                        <div className="flex-1 rounded-2xl border border-white/5 hover:border-white/20 transition-all flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-zinc-600 cursor-pointer">Open Repo</div>
                     </div>
                  </div>
               </div>

               <div className="pt-6 flex gap-4">
                  <button type="button" onClick={onClose} className="flex-1 h-14 bg-zinc-900 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all">Cancel</button>
                  <button type="submit" className="flex-1 h-14 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5">Create Workspace</button>
               </div>
            </form>
         </div>
      </div>
    </div>
  );
}
