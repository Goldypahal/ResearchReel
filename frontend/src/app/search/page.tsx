"use client";

import React, { useState } from 'react';
import Image from 'next/image';

const RECENT_SEARCHES = [
  { id: 1, text: 'Quantum Error Correction', type: 'topic' },
  { id: 2, text: 'sarah_chen', type: 'user', avatar: 'https://i.pravatar.cc/150?u=b042581f4e29026024d' },
  { id: 3, text: 'CRISPR Technology', type: 'topic' },
  { id: 4, text: 'Tesla Patents', type: 'tag' },
];

const SUGGESTED_USERS = [
  { id: 1, name: 'Dr. Alan Turing', handle: '@alan_t', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d' },
  { id: 2, name: 'Prof. Sarah Chen', handle: '@sarah_chen', avatar: 'https://i.pravatar.cc/150?u=b042581f4e29026024d' },
  { id: 3, name: 'Dr. Emily Zhang', handle: '@dr_emily', avatar: 'https://i.pravatar.cc/150?u=c042581f4e29026024d' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] w-full">
      <main className="max-w-[600px] mx-auto px-4 pt-10 pb-24">
        
        {/* Search Bar */}
        <div className="relative mb-10">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scholars, papers, patents..."
            className="w-full bg-[var(--foreground)]/5 border border-[var(--border)]/10 rounded-2xl py-4 pl-12 pr-4 text-[var(--foreground)] placeholder-zinc-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">✕</button>
          )}
        </div>

        {/* Content based on query */}
        {!query ? (
          <div className="space-y-10">
             {/* Recent */}
             <section>
                <div className="flex items-center justify-between mb-4">
                   <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Recent</h2>
                   <button className="text-xs font-bold text-blue-500 hover:text-blue-400">Clear All</button>
                </div>
                <div className="flex flex-col">
                   {RECENT_SEARCHES.map((search) => (
                      <div key={search.id} className="flex items-center justify-between py-3 group cursor-pointer">
                         <div className="flex items-center gap-4">
                            {search.avatar ? (
                               <Image src={search.avatar} alt={search.text} width={40} height={40} className="w-10 h-10 rounded-full" />
                            ) : (
                               <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-zinc-500">
                                  {search.type === 'topic' ? '📄' : '🏷️'}
                               </div>
                            )}
                            <div>
                               <p className="text-sm font-semibold">{search.text}</p>
                               <span className="text-xs text-zinc-500 capitalize">{search.type}</span>
                            </div>
                         </div>
                         <button className="text-zinc-500 opacity-0 group-hover:opacity-100">✕</button>
                      </div>
                   ))}
                </div>
             </section>

             {/* Suggested Scholars */}
             <section>
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-6">Suggested Scholars</h2>
                <div className="grid grid-cols-1 gap-6">
                   {SUGGESTED_USERS.map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <Image src={user.avatar} alt={user.name} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                            <div>
                               <p className="text-sm font-bold">{user.name}</p>
                               <span className="text-xs text-zinc-500">{user.handle}</span>
                            </div>
                         </div>
                         <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all active:scale-95">
                            Follow
                         </button>
                      </div>
                   ))}
                </div>
             </section>
          </div>
        ) : (
          <div className="text-center py-20 text-zinc-500">
             <div className="text-4xl mb-4">🔬</div>
             <p>Searching for <span className="text-[var(--foreground)] font-bold">&ldquo;{query}&rdquo;</span>...</p>
          </div>
        )}

      </main>
    </div>
  );
}
