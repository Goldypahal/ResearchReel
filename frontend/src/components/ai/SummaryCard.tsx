"use client";

import React from 'react';

interface SummaryProps {
  abstract: string;
  key_points: string[];
  paper_title: string;
}

export default function SummaryCard({ summary }: { summary: SummaryProps }) {
  return (
    <div className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[32px] p-10 space-y-10 group overflow-hidden relative shadow-2xl">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/05 rounded-full blur-[100px] -z-0"></div>

      <div className="space-y-4 relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-xl animate-pulse">🤖</div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest pl-1">AI Generated Summary</span>
            <h2 className="text-2xl font-black tracking-tight text-white line-clamp-1">{summary.paper_title}</h2>
          </div>
        </div>
        <p className="text-zinc-500 text-sm leading-relaxed italic border-l-2 border-indigo-500/30 pl-4">{summary.abstract}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> Core Contributions
          </h3>
          <ul className="space-y-3">
             {summary.key_points.map((p, i) => (
               <li key={i} className="flex gap-3 items-start text-xs text-white/70 group/point">
                  <span className="text-indigo-500 font-bold group-hover/point:scale-110 transition-transform">0{i+1}.</span>
                  <span className="leading-relaxed">{p}</span>
               </li>
             ))}
          </ul>
        </div>

        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 flex flex-col justify-between">
           <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Video Script Draft</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-4">&ldquo;Did you know neuro-symbolic reasoning is bridging the gap between logic and scale? Our latest paper explains how we achieved a 24% boost in generalization...&rdquo;</p>
           </div>
           <button className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all">Generate Reel Draft</button>
        </div>
      </div>

      <div className="pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
         <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-[8px] font-bold">U{i}</div>
            ))}
            <div className="w-8 h-8 rounded-full bg-zinc-900 border-2 border-zinc-900 flex items-center justify-center text-[8px] font-bold text-indigo-500">22+</div>
         </div>
         <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest italic">Analyzing 4,200 chunks...</span>
      </div>

    </div>
  );
}
