"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Award, Lock, PenTool, BookOpen, Film, Bot, Users, Flame, Globe, Heart, MessageCircle, Shield, CheckCircle2 } from 'lucide-react';
import { communityApi, errorMessage, type Badge } from '@/lib/api';
import { Spinner, ErrorState } from '@/components/common';
import { useAuth } from '@/context/AuthContext';

const ICONS: Record<string, React.ElementType> = { pen: PenTool, book: BookOpen, film: Film, bot: Bot, users: Users, flame: Flame, globe: Globe, heart: Heart, message: MessageCircle, shield: Shield };

function AchievementsInner() {
  const { user } = useAuth();
  const other = useSearchParams().get('u');
  const [data, setData] = useState<{ badges: Badge[]; unlocked_count: number; total_score: number } | null>(null);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => { communityApi.achievements(other || undefined).then(setData).catch((e) => setError(errorMessage(e))); }, [other]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <Spinner />;
  const categories = ['All', ...Array.from(new Set(data.badges.map((b) => b.category)))];
  const shown = data.badges.filter((b) => category === 'All' || b.category === category);
  const isSelf = !other || other === user?.username;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Award className="text-amber-300" /> {isSelf ? 'Your achievements' : `@${other}'s achievements`}</h1>
          <p className="text-sm text-zinc-500">Badges unlock automatically as you share and engage.</p>
        </div>
        <div className="flex gap-6 p-4 rounded-2xl border border-[var(--border)]">
          <div className="text-center"><p className="text-2xl font-bold">{data.unlocked_count}<span className="text-sm text-zinc-500">/{data.badges.length}</span></p><p className="text-[11px] text-zinc-500 uppercase">Unlocked</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{data.total_score}</p><p className="text-[11px] text-zinc-500 uppercase">Points</p></div>
          {isSelf && <Link href="/leaderboard" className="self-center text-sm text-indigo-400">Leaderboard →</Link>}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {categories.map((c) => <button key={c} onClick={() => setCategory(c)} className={`px-3.5 py-1.5 rounded-full text-sm font-semibold ${category === c ? 'bg-indigo-600 text-white' : 'bg-[var(--foreground)]/5 text-zinc-400'}`}>{c}</button>)}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.map((b) => {
          const Icon = ICONS[b.icon] || Award;
          return (
            <div key={b.id} className={`rounded-2xl border p-5 space-y-3 ${b.unlocked ? 'border-amber-400/30 bg-amber-400/[0.04]' : 'border-[var(--border)] opacity-80'}`}>
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${b.unlocked ? 'bg-amber-400/15 text-amber-300' : 'bg-[var(--foreground)]/5 text-zinc-500'}`}><Icon size={22} /></div>
                {b.unlocked ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Lock size={16} className="text-zinc-500" />}
              </div>
              <div><p className="font-semibold">{b.name}</p><p className="text-sm text-zinc-500">{b.description}</p></div>
              <div className="space-y-1">
                <div className="h-1.5 rounded bg-[var(--foreground)]/10 overflow-hidden"><div className={`h-full ${b.unlocked ? 'bg-amber-400' : 'bg-indigo-500'}`} style={{ width: `${(b.progress / b.goal) * 100}%` }} /></div>
                <p className="text-[11px] text-zinc-500">{b.progress}/{b.goal}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  return <Suspense fallback={<Spinner />}><AchievementsInner /></Suspense>;
}
