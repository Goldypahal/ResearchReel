"use client";

import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

interface FollowModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'followers' | 'following';
}

const mockFollowers = [
  { id: '1', username: 'quantum_lab', name: 'Quantum Lab', avatar: 'QL', isFollowing: true },
  { id: '2', username: 'bio_tech', name: 'BioTech Research', avatar: 'BT', isFollowing: false },
  { id: '3', username: 'astro_sarah', name: 'Sarah Jenkins', avatar: 'SJ', isFollowing: true },
  { id: '4', username: 'neural_net', name: 'AI Dynamics', avatar: 'NN', isFollowing: false },
  { id: '5', username: 'deep_sea', name: 'Oceanic Inst', avatar: 'DS', isFollowing: true },
];

export default function FollowModal({ isOpen, onClose, type }: FollowModalProps) {
  const [search, setSearch] = useState('');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-[var(--background)] border border-[var(--border)]/20 rounded-2xl w-full max-w-[400px] h-[70vh] max-h-[500px] shadow-2xl z-10 flex flex-col overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]/10">
          <div className="w-8" /> {/* spacer */}
          <h2 className="text-base font-bold text-[var(--foreground)] capitalize">{type}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--foreground)]/5 transition-colors text-[var(--foreground)]">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--foreground)]/5 border border-[var(--border)]/10 rounded-xl py-2 pl-9 pr-4 text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {mockFollowers
            .filter(f => f.username.toLowerCase().includes(search.toLowerCase()) || f.name.toLowerCase().includes(search.toLowerCase()))
            .map(user => (
            <div key={user.id} className="flex items-center justify-between p-2 hover:bg-[var(--foreground)]/5 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-500 font-bold flex items-center justify-center text-xs">
                  {user.avatar}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[var(--foreground)] tracking-tight">{user.username}</span>
                  <span className="text-[11px] text-zinc-500">{user.name}</span>
                </div>
              </div>
              <button className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                user.isFollowing 
                  ? 'bg-[var(--foreground)]/10 text-[var(--foreground)] hover:bg-red-500/20 hover:text-red-500' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500'
              }`}>
                {user.isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
