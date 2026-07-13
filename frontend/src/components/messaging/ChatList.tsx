"use client";

import React, { useState } from 'react';

interface Conversation {
  id: string;
  name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_group: boolean;
  avatar?: string;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: "c1", name: "Dr. Julia Newton", last_message: "The transformer weights are...", last_message_time: "10:24 AM", unread_count: 2, is_group: false },
  { id: "c2", name: "Neuro-Symbolic Group", last_message: "Meeting at 4pm today.", last_message_time: "Yesterday", unread_count: 0, is_group: true },
  { id: "c3", name: "Alex Thompson", last_message: "Metasurface results are in.", last_message_time: "Mar 30", unread_count: 0, is_group: false }
];

export default function ChatList({ activeId, onSelect }: { activeId: string, onSelect: (id: string) => void }) {
  const [tab, setTab] = useState<'all' | 'dm' | 'group'>('all');

  return (
    <div className="w-full md:w-96 flex flex-col h-full border-r border-white/10 bg-zinc-900/40 backdrop-blur-3xl">
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-white">Messages</h1>
        <input 
          type="text" 
          placeholder="Search conversations..." 
          className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm outline-none focus:border-indigo-500/50 transition-all font-medium"
        />
        <div className="flex gap-2">
           <button onClick={() => setTab('all')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'all' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-500 hover:bg-white/10'}`}>All</button>
           <button onClick={() => setTab('dm')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'dm' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-500 hover:bg-white/10'}`}>Direct</button>
           <button onClick={() => setTab('group')} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'group' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-500 hover:bg-white/10'}`}>Groups</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-1">
        {MOCK_CONVERSATIONS.map(c => (
          <div 
            key={c.id} 
            onClick={() => onSelect(c.id)}
            className={`flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all group ${activeId === c.id ? 'bg-indigo-600/10 border border-indigo-500/20' : 'hover:bg-white/5 border border-transparent'}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-xl ${c.is_group ? 'bg-gradient-to-tr from-purple-500 to-indigo-500' : 'bg-zinc-800 border border-white/10 group-hover:scale-105 transition-transform'}`}>
               {c.name.slice(0,1)}
            </div>
            <div className="flex-1 min-w-0">
               <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-white truncate pr-2">{c.name}</span>
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{c.last_message_time}</span>
               </div>
               <div className="flex items-center justify-between">
                  <p className={`text-xs truncate italic ${c.unread_count > 0 ? 'text-zinc-300 font-bold' : 'text-zinc-500'}`}>{c.last_message}</p>
                  {c.unread_count > 0 && <span className="w-2 h-2 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/40"></span>}
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
