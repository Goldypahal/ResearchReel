"use client";

import React, { useState } from 'react';

interface Version {
  id: string;
  version_number: number;
  author_id: string;
  author_name: string;
  comment: string;
  sent_at: string;
  type: 'major' | 'minor' | 'patch';
}

const MOCK_VERSIONS: Version[] = [
  { id: "v1", version_number: 1.4, author_id: "u1", author_name: "Dr. Julia Newton", comment: "Updated methodology section with new transformer weights.", sent_at: "Today, 10:24 AM", type: "major" },
  { id: "v2", version_number: 1.3, author_id: "me", author_name: "Me", comment: "Refined abstract and keywords for CVPR submission.", sent_at: "Yesterday, 4:20 PM", type: "minor" },
  { id: "v3", version_number: 1.2, author_id: "u2", author_name: "Alex Thompson", comment: "Added metasurface calibration results.", sent_at: "Mar 30, 2026", type: "patch" }
];

export default function VersionControl() {
  const [activeVersionId, setActiveVersionId] = useState('v1');

  return (
    <div className="w-full md:w-96 flex flex-col h-full border-l border-white/10 bg-zinc-900/40 backdrop-blur-3xl pt-24 px-6 space-y-6 animate-fade-in relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/05 rounded-full blur-[100px] -z-0"></div>

      <div className="flex items-center justify-between mb-2 relative z-10">
         <h1 className="text-xl font-black tracking-tight text-white italic">Version Control</h1>
         <button className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30 transition-all">Snapshot</button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-10 relative z-10 custom-scrollbar pr-2">
         {MOCK_VERSIONS.map(v => (
            <div 
              key={v.id} 
              onClick={() => setActiveVersionId(v.id)}
              className={`p-6 rounded-[32px] border transition-all cursor-pointer group ${activeVersionId === v.id ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
            >
               <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 py-1 px-2 rounded-lg">v.{v.version_number}</span>
                     <span className={`text-[8px] font-black uppercase tracking-widest ${v.type === 'major' ? 'text-red-500' : 'text-zinc-600'}`}>{v.type} update</span>
                  </div>
                  <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">{v.sent_at}</span>
               </div>
               <p className="text-xs text-white/80 leading-relaxed font-bold italic mb-4 line-clamp-2">&ldquo;{v.comment}&rdquo;</p>
               
               <div className="flex items-center justify-between pt-4 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-[8px] font-bold">{v.author_name.slice(0,2)}</div>
                     <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{v.author_name}</span>
                  </div>
                  <div className="flex gap-2">
                     <button className="text-[9px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">Diff</button>
                     <button className="text-[9px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">Rollback</button>
                  </div>
               </div>
            </div>
         ))}
      </div>

      {/* Sync Status Sidebar (Section 4.3.2) */}
      <div className="pb-10 space-y-4 relative z-10 border-t border-white/5 pt-8">
         <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic">Sync Status</span>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/30"></span>
               <span className="text-[9px] font-black text-white uppercase tracking-widest">Active</span>
            </div>
         </div>
         <div className="p-4 rounded-3xl bg-black/40 border border-white/5 flex items-center justify-between group cursor-pointer hover:border-black transition-all">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-zinc-900 rounded-xl flex items-center justify-center grayscale group-hover:grayscale-0 transition-grayscale">G</div>
               <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition-colors uppercase tracking-tight">Github Repository</span>
            </div>
            <span className="text-zinc-700 text-xs py-1 px-3 border border-white/5 rounded-full hover:bg-white/5 transition-all">Linked</span>
         </div>
      </div>
    </div>
  );
}
