"use client";

import React from 'react';

export default function AnalyticsDashboard() {
  const metrics = [
    { label: "Profile Views", value: "1.2k", growth: "+14%", color: "text-blue-500" },
    { label: "Paper Downloads", value: "450", growth: "+8%", color: "text-green-500" },
    { label: "Citation Impact", value: "h-index: 12", growth: "+2", color: "text-yellow-500" },
    { label: "Reel Reach", value: "85k", growth: "+120%", color: "text-purple-500" }
  ];

  return (
    <div className="w-full bg-[var(--background)] border border-[var(--border)]/10 rounded-[48px] p-8 md:p-12 space-y-12 animate-fade-in relative overflow-hidden shadow-2xl transition-all">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] -z-0"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
         <div className="space-y-1">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] italic">Impact Analytics (Section 3.6.3)</span>
            <h2 className="text-4xl font-black tracking-tighter text-[var(--foreground)] italic uppercase">Research Engagement</h2>
         </div>
         <div className="flex gap-4">
            <select className="bg-[var(--foreground)]/5 border border-[var(--border)]/10 rounded-xl px-5 py-2.5 text-[10px] font-black text-[var(--foreground)] outline-none focus:border-indigo-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-widest">
               <option>Last 30 Days</option>
               <option>Last 90 Days</option>
               <option>Custom Range</option>
            </select>
            <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95">Export CSV</button>
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 relative z-10 transition-transform cursor-default">
         {metrics.map(m => (
            <div key={m.label} className="p-8 bg-[var(--foreground)]/[0.02] border border-[var(--border)]/10 rounded-[32px] hover:border-indigo-500/30 group transition-all transform hover:scale-105 hover:shadow-xl">
               <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">{m.label}</span>
               <div className="flex items-baseline gap-3 mt-2">
                  <span className="text-3xl font-black text-[var(--foreground)]">{m.value}</span>
                  <span className={`text-[10px] font-black uppercase ${m.color}`}>{m.growth}</span>
               </div>
               <div className="w-full h-1.5 bg-[var(--foreground)]/5 rounded-full mt-6 overflow-hidden">
                  <div className={`h-full ${m.color.replace('text-', 'bg-')} opacity-30 w-3/4 group-hover:opacity-100 transition-all`}></div>
               </div>
            </div>
         ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
         
         {/* Growth Graph Placeholder */}
         <div className="p-8 bg-[var(--foreground)]/[0.02] border border-[var(--border)]/10 rounded-[40px] space-y-8 flex flex-col h-[400px]">
            <div className="flex items-center justify-between">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Citation Growth Timeline</h3>
               <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest italic py-1 px-3 border border-indigo-500/10 rounded-full bg-indigo-500/5">Trend: Accumulative</span>
            </div>
            <div className="flex-1 flex items-end gap-3 pb-4">
               {[0.2, 0.4, 0.3, 0.7, 0.5, 0.9, 0.6, 0.8].map((h, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-indigo-600/10 via-indigo-600/30 to-indigo-500 rounded-xl group cursor-pointer relative" style={{ height: `${h * 100}%` }}>
                     <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[var(--foreground)] text-[var(--background)] text-[9px] font-black rounded shadow-2xl">+{Math.round(h*10)}</div>
                  </div>
               ))}
            </div>
         </div>

         {/* Top Content Rankings */}
         <div className="p-8 bg-[var(--foreground)]/[0.02] border border-[var(--border)]/10 rounded-[40px] space-y-8 flex flex-col h-[400px]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Top Impact Content</h3>
            <div className="space-y-6 overflow-y-auto no-scrollbar">
               {[
                 { title: "Neuro-Symbolic Integration", views: "14.2k", stat: "+4.2k Citations", type: "Reel" },
                 { title: "Transformer Scaling Dynamics", views: "8.5k", stat: "1.2k Downloads", type: "Document" },
                 { title: "OOD Generalization Study", views: "2.1k", stat: "84 Discussions", type: "Post" }
               ].map((c, i) => (
                 <div key={i} className="flex items-center gap-6 group hover:translate-x-2 transition-all cursor-pointer">
                    <div className="w-12 h-12 bg-[var(--foreground)]/5 border border-[var(--border)]/10 rounded-2xl flex items-center justify-center font-black text-zinc-500 group-hover:bg-indigo-600/10 group-hover:text-indigo-500 group-hover:border-indigo-500/20 transition-all shadow-sm">{i+1}</div>
                    <div className="flex-1 min-w-0">
                       <h4 className="font-black text-[var(--foreground)] text-sm truncate uppercase tracking-tighter group-hover:text-indigo-500 transition-colors">{c.title}</h4>
                       <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{c.type} • {c.views} views</span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest italic">{c.stat}</span>
                 </div>
               ))}
            </div>
         </div>

      </div>

    </div>
  );
}
