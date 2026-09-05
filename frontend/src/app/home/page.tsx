"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Bot, ArrowRight, Upload, Sparkles, Film, Users, BookOpen, 
  Clock, Bookmark, Search, Star, MessageSquare, Play, ChevronRight 
} from 'lucide-react';
import Feed from '@/components/feed/Feed';

export default function HomeDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [aiPrompt, setAiPrompt] = useState('');

  const handleAiAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiPrompt.trim()) {
      router.push(`/ai/ask?q=${encodeURIComponent(aiPrompt.trim())}`);
    } else {
      router.push('/ai/ask');
    }
  };

  const continueResearching = [
    {
      id: 'doc_1',
      title: 'Attention Is All You Need',
      authors: 'Vaswani et al. (Google Brain)',
      lastOpened: '2 hours ago',
      progress: 85,
      tag: 'Transformer'
    },
    {
      id: 'doc_2',
      title: 'BERT: Pre-training of Deep Bidirectional Transformers',
      authors: 'Devlin et al. (Google AI Language)',
      lastOpened: 'Yesterday',
      progress: 60,
      tag: 'NLP'
    },
    {
      id: 'doc_3',
      title: 'Retrieval-Augmented Generation for Knowledge-Intensive Tasks',
      authors: 'Lewis et al. (Meta AI)',
      lastOpened: '3 days ago',
      progress: 40,
      tag: 'RAG'
    }
  ];

  const recommendedPapers = [
    {
      id: 'rec_1',
      title: 'Graph Attention Networks for Molecular Property Prediction',
      authors: 'Veličković et al. • Cambridge University',
      year: '2025',
      citations: 342,
      reason: 'Because you saved Attention Is All You Need'
    },
    {
      id: 'rec_2',
      title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model',
      authors: 'Rafailov et al. • Stanford University',
      year: '2024',
      citations: 580,
      reason: 'Recommended based on your AI/ML research profile'
    }
  ];

  const activeProjects = [
    {
      id: 'proj_1',
      title: 'AI Text Detection Research',
      members: 4,
      papers: 12,
      tasks: 8,
      progress: 72
    },
    {
      id: 'proj_2',
      title: 'Quantum Computing Benchmark',
      members: 3,
      papers: 6,
      tasks: 4,
      progress: 45
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Good morning, {user?.full_name || user?.username || 'Researcher'}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Welcome to your AI research workspace.
          </p>
        </div>
      </div>

      {/* Hero AI Copilot Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/80 via-purple-900/60 to-slate-900 border border-indigo-500/30 p-6 md:p-8 shadow-2xl space-y-4">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Bot size={180} className="text-indigo-400" />
        </div>

        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
          <Sparkles size={16} />
          <span>Research Copilot</span>
        </div>

        <h2 className="text-xl md:text-2xl font-bold text-white max-w-xl">
          What are you researching today?
        </h2>

        <form onSubmit={handleAiAsk} className="relative max-w-2xl">
          <input
            type="text"
            placeholder="Ask anything about papers, methods, dataset benchmarks, or research gaps..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="w-full pl-4 pr-12 py-3.5 text-sm bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:border-indigo-400 text-white placeholder:text-zinc-400 shadow-inner"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Quick Action Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
          <span className="text-zinc-400 font-medium">Quick Actions:</span>
          <button 
            onClick={() => router.push('/library')} 
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/10 flex items-center gap-1.5 transition-colors"
          >
            <Upload size={14} /> Upload Paper
          </button>
          <button 
            onClick={() => router.push('/ai/ask')} 
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/10 flex items-center gap-1.5 transition-colors"
          >
            <Bot size={14} /> Ask AI
          </button>
          <button 
            onClick={() => router.push('/reels/create')} 
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/10 flex items-center gap-1.5 transition-colors"
          >
            <Film size={14} /> Create Reel
          </button>
          <button 
            onClick={() => router.push('/projects/new')} 
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/10 flex items-center gap-1.5 transition-colors"
          >
            <Users size={14} /> New Project
          </button>
        </div>
      </div>

      {/* Continue Researching Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            <Clock size={18} className="text-indigo-500" />
            <span>Continue Researching</span>
          </h3>
          <Link href="/library" className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1">
            <span>View Library</span> <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {continueResearching.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/library/documents/${item.id}`)}
              className="p-4 rounded-xl bg-[var(--foreground)]/[0.03] border border-[var(--border)] hover:border-indigo-500/40 hover:bg-indigo-500/[0.03] transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {item.tag}
                </span>
                <span className="text-[11px] text-muted-foreground">{item.lastOpened}</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--foreground)] group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {item.title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.authors}</p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Reading progress</span>
                  <span>{item.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Recommended Papers & Active Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recommended Research */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-500" />
              <span>Recommended Research</span>
            </h3>
            <Link href="/discover" className="text-xs font-semibold text-indigo-400 hover:underline">
              Discover More
            </Link>
          </div>

          <div className="space-y-3">
            {recommendedPapers.map((paper) => (
              <div
                key={paper.id}
                className="p-4 rounded-xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] hover:border-indigo-500/30 transition-all space-y-2"
              >
                <div className="flex items-center gap-2 text-[11px] text-indigo-400 font-medium">
                  <Star size={12} className="fill-indigo-400" />
                  <span>{paper.reason}</span>
                </div>
                <h4 className="text-sm font-bold text-[var(--foreground)] hover:text-indigo-400 cursor-pointer transition-colors">
                  {paper.title}
                </h4>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>{paper.authors}</span>
                  <div className="flex items-center gap-3">
                    <span>{paper.year}</span>
                    <span>•</span>
                    <span>{paper.citations} citations</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Social Feed Overview */}
          <div className="pt-4 space-y-4">
            <h3 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-500" />
              <span>Research Community Feed</span>
            </h3>
            <Feed />
          </div>
        </div>

        {/* Right Column: Active Projects */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                <Users size={16} className="text-indigo-500" />
                <span>Active Projects</span>
              </h3>
              <Link href="/projects" className="text-xs font-semibold text-indigo-400 hover:underline">
                All Projects
              </Link>
            </div>

            <div className="space-y-3">
              {activeProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => router.push(`/projects/${proj.id}`)}
                  className="p-4 rounded-xl bg-[var(--foreground)]/[0.03] border border-[var(--border)] hover:border-indigo-500/40 cursor-pointer transition-all space-y-3"
                >
                  <h4 className="text-sm font-bold text-[var(--foreground)]">{proj.title}</h4>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{proj.members} members</span>
                    <span>{proj.papers} papers</span>
                    <span>{proj.tasks} tasks</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Progress</span>
                      <span>{proj.progress}%</span>
                    </div>
                    <div className="w-full h-1 bg-[var(--border)] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${proj.progress}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
