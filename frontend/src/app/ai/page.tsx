"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Sparkles, FileText, Search, Star, Layers, ArrowRight } from 'lucide-react';

export default function AIResearchHub() {
  const router = useRouter();

  const features = [
    {
      title: 'Ask AI Copilot',
      description: 'Reason about papers, extract findings, and clarify mathematical derivations',
      icon: Bot,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      href: '/ai/ask'
    },
    {
      title: 'Structured Summaries',
      description: 'Generate concise or detailed executive summaries and methodology breakdowns',
      icon: FileText,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      href: '/ai/summarize'
    },
    {
      title: 'Research Gap Finder',
      description: 'Identify limitations, unaddressed questions, and future research opportunities',
      icon: Search,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      href: '/ai/ask?mode=gaps'
    },
    {
      title: 'Paper Recommendations',
      description: 'Find related publications tailored to your current research interests',
      icon: Star,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      href: '/ai/recommendations'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Hero Header */}
      <div className="text-center space-y-3 py-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
          <Sparkles size={14} />
          <span>Research Copilot Suite</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--foreground)]">
          AI Research Hub
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground max-w-xl mx-auto">
          Accelerate your academic workflow with specialized artificial intelligence models trained on scientific literature.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.title}
              onClick={() => router.push(feat.href)}
              className="p-6 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] hover:border-indigo-500/40 hover:bg-indigo-500/[0.03] transition-all cursor-pointer space-y-4 group"
            >
              <div className={`w-12 h-12 rounded-xl border ${feat.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[var(--foreground)] group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                  <span>{feat.title}</span>
                  <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feat.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
