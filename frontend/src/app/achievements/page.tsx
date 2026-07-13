"use client";

import React from 'react';
import { Award, Lock, CheckCircle, Zap, Shield, Flame, Globe, BookOpen, PenTool, Lightbulb } from 'lucide-react';

export default function AchievementsPage() {
  const categories = [
    { name: 'Research Impact', icon: Zap, color: 'text-yellow-500' },
    { name: 'Social Influence', icon: Flame, color: 'text-orange-500' },
    { name: 'Innovation', icon: Lightbulb, color: 'text-emerald-500' },
  ];

  const badges = [
    { id: 1, name: 'Patent Pioneer', desc: 'Filed your first patent via ResearchReel.', icon: Shield, unlocked: true, date: '2 days ago', color: 'bg-indigo-600' },
    { id: 2, name: 'The Visionary', desc: 'Achieved 1M+ views on a research reel.', icon: Globe, unlocked: true, date: '1 week ago', color: 'bg-purple-600' },
    { id: 3, name: 'Peer Reviewer I', desc: 'Reviewed 10 academic manuscripts.', icon: CheckCircle, unlocked: true, date: 'Mar 2026', color: 'bg-emerald-600' },
    { id: 4, name: 'Citation Magnet', desc: 'Received 100+ citations in a month.', icon: Zap, unlocked: false, requirement: '88/100 Citations', color: 'bg-yellow-600' },
    { id: 5, name: 'Deep Reader', desc: 'Read 50 unique research papers.', icon: BookOpen, unlocked: false, requirement: '42/50 Papers', color: 'bg-blue-600' },
    { id: 6, name: 'Master Scribe', desc: 'Drafted 5 full paper methodologies.', icon: PenTool, unlocked: false, requirement: '3/5 Drafts', color: 'bg-rose-600' },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="max-w-6xl mx-auto px-6 pt-6 md:pt-24 pb-12 md:pb-24">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
           <div className="space-y-4">
              <h1 className="text-5xl font-black uppercase tracking-tighter italic">Vault of Merit</h1>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.5em]">Your Academic Legacy in Badges</p>
           </div>
           <div className="flex items-center gap-6 p-6 bg-white/5 rounded-[32px] border border-white/10">
              <div className="flex flex-col items-center border-r border-white/10 pr-6">
                 <span className="text-2xl font-black">12</span>
                 <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Unlocked</span>
              </div>
              <div className="flex flex-col items-center">
                 <span className="text-2xl font-black text-zinc-600">450</span>
                 <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Global Rank</span>
              </div>
           </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-4 mb-16 overflow-x-auto pb-4 custom-scrollbar">
           {categories.map((cat) => (
              <button key={cat.name} className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all whitespace-nowrap">
                 <cat.icon size={16} className={cat.color} />
                 <span className="text-[10px] font-black uppercase tracking-widest">{cat.name}</span>
              </button>
           ))}
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {badges.map((badge) => (
              <div 
                key={badge.id}
                className={`relative group p-8 rounded-[40px] border transition-all duration-500 ${
                  badge.unlocked 
                    ? 'bg-white/[0.03] border-white/10 hover:border-white/20' 
                    : 'bg-black/40 border-white/5 grayscale opacity-60'
                }`}
              >
                 <div className={`w-16 h-16 rounded-2xl ${badge.color} flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                    {badge.unlocked ? <badge.icon size={32} className="text-white" /> : <Lock size={32} className="text-black/40" />}
                 </div>

                 <h3 className={`text-lg font-black uppercase mb-3 ${badge.unlocked ? 'text-white' : 'text-zinc-600'}`}>{badge.name}</h3>
                 <p className="text-xs text-zinc-500 leading-relaxed mb-8">{badge.desc}</p>

                 {badge.unlocked ? (
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase text-emerald-500 tracking-widest">
                       <CheckCircle size={12} />
                       Unlocked {badge.date}
                    </div>
                 ) : (
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-zinc-700 rounded-full" 
                         style={{ width: `${(parseInt(badge.requirement?.split('/')[0] || '0') / parseInt(badge.requirement?.split('/')[1] || '100')) * 100}%` }}
                       ></div>
                       <span className="absolute bottom-8 right-8 text-[9px] font-black text-zinc-600 uppercase tracking-widest">{badge.requirement}</span>
                    </div>
                 )}

                 {!badge.unlocked && (
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] rounded-[40px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full">Coming Soon</span>
                    </div>
                 )}
              </div>
           ))}
        </div>

        {/* Milestone Progress */}
        <section className="mt-32 p-12 bg-indigo-600/10 border border-indigo-500/20 rounded-[50px] relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[120px] rounded-full -mr-32 -mt-32"></div>
           <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                 <h2 className="text-3xl font-black uppercase tracking-tighter italic">Next Milestone: Elite Fellow</h2>
                 <p className="text-sm text-zinc-400 leading-loose max-w-lg">
                    Unlock the &ldquo;Elite Fellow&rdquo; status by completing 3 more Research Impact badges. Elite status grants access to exclusive funding opportunities and private scholar networks.
                 </p>
                 <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>
                 </div>
              </div>
              <div className="w-48 h-48 rounded-full border-8 border-indigo-500/20 flex items-center justify-center relative">
                 <div className="text-center">
                    <span className="text-5xl font-black">66%</span>
                    <p className="text-[8px] font-black uppercase tracking-widest text-indigo-400 mt-2">Complete</p>
                 </div>
                 <div className="absolute -top-4 -right-4 w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-xl">
                    <Award size={24} />
                 </div>
              </div>
           </div>
        </section>

      </main>
    </div>
  );
}
