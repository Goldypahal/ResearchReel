"use client";

import React, { useState } from 'react';
import KanbanBoard from '@/components/collaboration/KanbanBoard';
import VersionControl from '@/components/collaboration/VersionControl';
import CreateProjectModal from '@/components/collaboration/CreateProjectModal';

export default function ProjectsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="h-[calc(100vh-128px)] md:h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden flex flex-col selection:bg-indigo-500/30">
       <main className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-screen-2xl mx-auto w-full border-x border-white/5 shadow-2xl relative">
          
          <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

          {/* Top Bar for Context */}
          <div className="absolute top-0 left-0 w-full h-16 bg-black/40 backdrop-blur-3xl border-b border-white/5 z-20 flex items-center justify-between px-8">
             <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-lg">📁</div>
                   <h1 className="text-xl font-black tracking-tight text-white uppercase italic">Active Collaboration</h1>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-4">Project: Neural Integration v2</span>
                   <span className="text-indigo-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">Active</span>
                </div>
             </div>
             
             <div className="flex items-center gap-6">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform flex items-center gap-2"
                >
                   <span className="text-sm">+</span> New Scope
                </button>
                <div className="h-8 w-px bg-white/10 mx-2"></div>
                <button className="px-4 py-1.5 h-10 border border-white/10 rounded-xl hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white uppercase">Project Settings</button>
             </div>
          </div>

          {/* Left Column: Kanban Board */}
          <section className="flex-1 flex flex-col pt-16">
             <KanbanBoard />
          </section>

          {/* Right Column: Version Control Sidebar (Section 4.3.2) */}
          <VersionControl />

       </main>

    </div>
  );
}
