"use client";

import React from 'react';
import { X, Check } from 'lucide-react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { useSocial } from '@/context/SocialContext';

interface SwitchableUser {
  id: string;
  username: string;
  full_name: string;
  institution: string;
  role: UserRole;
  verification_status: string;
  avatarChar: string;
}

const SWITCHABLE_USERS: SwitchableUser[] = [
  {
    id: 'user-julia',
    username: 'julianewton',
    full_name: 'Dr. Julia Newton',
    institution: 'MIT CSAIL',
    role: 'scholar',
    verification_status: 'scholar',
    avatarChar: 'J'
  },
  {
    id: 'user-einstein',
    username: 'albert_einstein',
    full_name: 'Albert Einstein',
    institution: 'Institute for Advanced Study',
    role: 'professor',
    verification_status: 'scholar',
    avatarChar: 'A'
  },
  {
    id: 'user-curie',
    username: 'marie_curie',
    full_name: 'Marie Curie',
    institution: 'Sorbonne University',
    role: 'professor',
    verification_status: 'scholar',
    avatarChar: 'M'
  },
  {
    id: 'user-tesla',
    username: 'nikola_tesla',
    full_name: 'Nikola Tesla',
    institution: 'Tesla Lab',
    role: 'scholar',
    verification_status: 'scholar',
    avatarChar: 'N'
  },
  {
    id: 'user-turing',
    username: 'alan_turing',
    full_name: 'Alan Turing',
    institution: 'National Physical Laboratory',
    role: 'scholar',
    verification_status: 'scholar',
    avatarChar: 'A'
  }
];

export default function SwitchProfileModal() {
  const { user: currentUser, login } = useAuth();
  const { isSwitchOpen, setIsSwitchOpen } = useSocial();

  if (!isSwitchOpen) return null;

  const handleSwitch = (selectedUser: SwitchableUser) => {
    login({
      id: selectedUser.id,
      email: `${selectedUser.username}@researchreel.edu`,
      username: selectedUser.username,
      verification_status: selectedUser.verification_status,
      role: selectedUser.role,
      full_name: selectedUser.full_name
    }, `token-switch-${selectedUser.username}`);

    setIsSwitchOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300 animate-in fade-in">
      <div className="relative w-full max-w-[400px] bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden transition-all scale-in duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]/10">
          <h3 className="text-md font-black uppercase tracking-tight">Switch Accounts</h3>
          <button 
            onClick={() => setIsSwitchOpen(false)}
            className="p-1 rounded-full text-zinc-400 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* User list */}
        <div className="py-2 divide-y divide-[var(--border)]/5 max-h-[350px] overflow-y-auto">
          {SWITCHABLE_USERS.map((item) => {
            const isSelected = currentUser?.username === item.username;
            return (
              <button
                key={item.username}
                onClick={() => handleSwitch(item)}
                className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-[var(--foreground)]/[0.02] active:bg-[var(--foreground)]/[0.05] transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-md font-black text-indigo-500 italic">
                    {item.avatarChar}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black lowercase tracking-tight flex items-center gap-1.5">
                      {item.username}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-semibold">{item.full_name} • <span className="italic">{item.institution}</span></span>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
