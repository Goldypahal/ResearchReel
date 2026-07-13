"use client";

import React, { useState } from 'react';
import Feed from '@/components/feed/Feed';

export default function SavedPage() {
  const [tab, setTab] = useState<'all' | 'papers' | 'reels' | 'code'>('all');

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-indigo-500/30">
      <main className="max-w-7xl mx-auto px-4 pt-6 md:pt-24 pb-12 md:pb-24 space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-10">
           <div className="space-y-1">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] italic">Knowledge Library (Section 3.6.2)</span>
              <h2 className="text-4xl font-black tracking-tight text-white italic">Saved Resources</h2>
           </div>
           
           <div className="flex gap-8 relative overflow-x-auto no-scrollbar pb-2">
              {[
                { key: 'all', label: 'All Artifacts' },
                { key: 'papers', label: 'Technical Papers' },
                { key: 'reels', label: 'Reel Summaries' },
                { key: 'code', label: 'Code & Data' }
              ].map(t => (
                <button 
                  key={t.key} 
                  onClick={() => setTab(t.key as 'all' | 'papers' | 'reels' | 'code')}
                  className={`text-[11px] font-black uppercase tracking-widest transition-all relative pb-2 ${tab === t.key ? 'text-indigo-500' : 'text-zinc-600 hover:text-white'}`}
                >
                   {t.label}
                   {tab === t.key && <span className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-500 shadow-lg shadow-indigo-500/30"></span>}
                </button>
              ))}
           </div>
        </div>

        <section className="animate-fade-in">
           {tab === 'all' && (
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_300px] gap-12">
                 <Feed />
                 <aside className="space-y-8 hidden md:block">
                    <div className="p-8 bg-zinc-900/40 border border-white/5 rounded-[40px] space-y-6">
                       <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">Library Stats</h3>
                       <div className="space-y-4">
                          <div className="flex items-center justify-between">
                             <span className="text-xs font-bold text-white">Papers</span>
                             <span className="text-xs text-indigo-500 font-black">12</span>
                          </div>
                          <div className="flex items-center justify-between">
                             <span className="text-xs font-bold text-white">Reels</span>
                             <span className="text-xs text-indigo-500 font-black">45</span>
                          </div>
                          <div className="flex items-center justify-between">
                             <span className="text-xs font-bold text-white">Code Gists</span>
                             <span className="text-xs text-indigo-500 font-black">8</span>
                          </div>
                       </div>
                       <button className="w-full h-10 bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white hover:text-black transition-all">Organize Folders</button>
                    </div>
                 </aside>
              </div>
           )}

           {tab !== 'all' && (
              <div className="text-center py-40 animate-fade-in opacity-50 relative overflow-hidden bg-zinc-900/40 rounded-[48px] border border-white/5">
                 <div className="text-4xl">📂</div>
                 <h3 className="text-xl font-black text-white italic">Category Empty</h3>
                 <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Filter results to see your saved items.</p>
              </div>
           )}
        </section>

      </main>

    </div>
  );
}
