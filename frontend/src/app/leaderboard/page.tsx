"use client";

import React, { useState } from 'react';
import { Trophy, Zap, Award, Search, Filter, ChevronRight, Star } from 'lucide-react';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('global');

  const topThree = [
    { rank: 2, name: 'Dr. Julia Newton', score: '9,840', impact: '+12%', avatar: 'JN', color: 'border-zinc-400', trophy: '🥈' },
    { rank: 1, name: 'Alan Turing Jr.', score: '12,500', impact: '+24%', avatar: 'AT', color: 'border-yellow-500', trophy: '🥇' },
    { rank: 3, name: 'Sarah Chen', score: '8,200', impact: '+8%', avatar: 'SC', color: 'border-orange-400', trophy: '🥉' },
  ];

  const rankings = [
    { rank: 4, name: 'Prof. Richard Feynman', institution: 'Caltech', score: '7,900', trend: 'up', badges: ['Creator', 'Top Reviewer'] },
    { rank: 5, name: 'Marie Curie', institution: 'Sorbonne', score: '7,450', trend: 'down', badges: ['Innovator'] },
    { rank: 6, name: 'Nikola Tesla', institution: 'Independent', score: '6,800', trend: 'up', badges: ['Patent King'] },
    { rank: 7, name: 'Ada Lovelace', institution: 'Analytical Engine Corp', score: '6,200', trend: 'up', badges: ['Logic Master'] },
    { rank: 8, name: 'Albert Einstein', institution: 'IAS Princeton', score: '5,900', trend: 'down', badges: ['Theorist'] },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-yellow-500/30 overflow-x-hidden">
      <main className="max-w-6xl mx-auto px-6 pt-6 md:pt-24 pb-12 md:pb-24">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-16 space-y-4">
           <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/20 mb-2 animate-pulse">
              <Trophy size={32} className="text-yellow-500" />
           </div>
           <h1 className="text-5xl font-black uppercase tracking-tighter italic">Global Hall of Fame</h1>
           <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.5em]">The Vanguard of Human Knowledge</p>
        </div>

        {/* Podium Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 items-end max-w-4xl mx-auto">
           {/* Second Place */}
           <div className="order-2 md:order-1 flex flex-col items-center">
              <div className="relative mb-6">
                 <div className="w-24 h-24 rounded-full border-4 border-zinc-400 bg-[var(--foreground)]/10 flex items-center justify-center text-2xl font-black relative overflow-hidden group transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)]/60 to-transparent"></div>
                    {topThree[0].avatar}
                 </div>
                 <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-zinc-400 text-black text-[10px] font-black px-3 py-1 rounded-full">{topThree[0].trophy} 2ND</span>
              </div>
              <h3 className="text-sm font-black uppercase mb-1">{topThree[0].name}</h3>
              <div className="flex items-center gap-2">
                 <Zap size={12} className="text-yellow-500" />
                 <span className="text-lg font-black">{topThree[0].score}</span>
              </div>
           </div>

           {/* First Place */}
           <div className="order-1 md:order-2 flex flex-col items-center scale-110">
              <div className="relative mb-8">
                 <div className="absolute -inset-4 bg-yellow-500/20 blur-2xl rounded-full animate-pulse"></div>
                 <div className="w-32 h-32 rounded-full border-4 border-yellow-500 bg-[var(--foreground)]/10 flex items-center justify-center text-4xl font-black relative overflow-hidden z-10 shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/20 to-transparent"></div>
                    {topThree[1].avatar}
                 </div>
                 <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-black px-4 py-1.5 rounded-full z-20 shadow-xl">{topThree[1].trophy} 1ST</span>
              </div>
              <h3 className="text-lg font-black uppercase mb-1">{topThree[1].name}</h3>
              <div className="flex items-center gap-2">
                 <Zap size={16} className="text-yellow-500" />
                 <span className="text-2xl font-black text-yellow-500">{topThree[1].score}</span>
              </div>
           </div>

           {/* Third Place */}
           <div className="order-3 md:order-3 flex flex-col items-center">
              <div className="relative mb-6">
                 <div className="w-24 h-24 rounded-full border-4 border-orange-400 bg-[var(--foreground)]/10 flex items-center justify-center text-2xl font-black relative overflow-hidden transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)]/60 to-transparent"></div>
                    {topThree[2].avatar}
                 </div>
                 <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-400 text-black text-[10px] font-black px-3 py-1 rounded-full">{topThree[2].trophy} 3RD</span>
              </div>
              <h3 className="text-sm font-black uppercase mb-1">{topThree[2].name}</h3>
              <div className="flex items-center gap-2">
                 <Zap size={12} className="text-yellow-500" />
                 <span className="text-lg font-black">{topThree[2].score}</span>
              </div>
           </div>
        </div>

        {/* Filters & List */}
        <div className="bg-[var(--foreground)]/[0.03] border border-[var(--border)]/10 rounded-[40px] p-8 backdrop-blur-3xl shadow-xl transition-all">
           <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 border-b border-[var(--border)]/10 pb-8">
              <div className="flex items-center gap-8">
                 {['Global', 'Institutions', 'Patent Hub'].map((tab) => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab.toLowerCase())}
                      className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.toLowerCase() ? 'text-yellow-500' : 'text-zinc-500 hover:text-[var(--foreground)]'}`}
                    >
                       {tab}
                    </button>
                 ))}
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                 <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                    <input 
                      type="text" 
                      placeholder="Search rank..." 
                      className="w-full bg-[var(--foreground)]/5 border border-[var(--border)]/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-[var(--foreground)] focus:outline-none focus:border-yellow-500/50 transition-all"
                    />
                 </div>
                 <button className="p-2.5 bg-[var(--foreground)]/5 rounded-xl border border-[var(--border)]/10 text-[var(--foreground)]"><Filter size={14} /></button>
              </div>
           </div>

           <div className="space-y-4">
              {rankings.map((user, i) => (
                 <div 
                   key={i} 
                   className="group flex items-center gap-6 p-6 bg-[var(--foreground)]/[0.02] border border-[var(--border)]/5 rounded-[32px] hover:bg-[var(--foreground)]/5 hover:border-yellow-500/20 transition-all cursor-pointer"
                 >
                    <span className="w-8 text-xl font-black text-zinc-600 group-hover:text-yellow-500/50 transition-colors">#{user.rank}</span>
                    
                    <div className="w-12 h-12 rounded-full bg-[var(--foreground)]/5 border border-[var(--border)]/10 flex items-center justify-center text-xs font-black text-[var(--foreground)]">
                       {user.name.split(' ').map(n => n[0]).join('')}
                    </div>

                    <div className="flex-1">
                       <h4 className="text-sm font-black uppercase group-hover:text-yellow-500 transition-colors">{user.name}</h4>
                       <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{user.institution}</span>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                       {user.badges.map((badge, bi) => (
                          <div key={bi} className="flex items-center gap-1.5 px-3 py-1 bg-[var(--foreground)]/5 rounded-full border border-[var(--border)]/5 text-[8px] font-black uppercase text-zinc-400">
                             <Award size={10} className="text-indigo-400" />
                             {badge}
                          </div>
                       ))}
                    </div>

                    <div className="text-right flex items-center gap-6">
                       <div className="flex flex-col">
                          <div className="flex items-center gap-2 justify-end">
                             <Zap size={12} className="text-yellow-500" />
                             <span className="text-sm font-black">{user.score}</span>
                          </div>
                          <span className={`text-[9px] font-black uppercase ${user.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                             {user.trend === 'up' ? '▲ Trending Up' : '▼ Falling'}
                          </span>
                       </div>
                       <ChevronRight className="text-zinc-700 group-hover:text-[var(--foreground)] transition-all" size={20} />
                    </div>
                 </div>
              ))}
           </div>

           <div className="mt-12 text-center">
              <button className="px-8 py-3 bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)] rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-[var(--border)]/10">
                 View Full Insights
              </button>
           </div>
        </div>
      </main>

      {/* Floating CTA for user's own rank */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
         <div className="bg-yellow-500 text-black px-8 py-4 rounded-full flex items-center gap-6 shadow-[0_0_40px_rgba(234,179,8,0.4)] animate-bounce-slow">
            <div className="flex items-center gap-3">
               <Star size={18} fill="black" />
               <span className="text-xs font-black uppercase tracking-widest">You are in Top 5%</span>
            </div>
            <div className="w-px h-6 bg-black/20"></div>
            <button className="text-[10px] font-black uppercase tracking-widest hover:underline">Climb Higher</button>
         </div>
      </div>

    </div>
  );
}
