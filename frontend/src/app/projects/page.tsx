"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, FileText, CheckSquare, Sparkles, Folder } from 'lucide-react';

export default function ProjectsPage() {
  const router = useRouter();

  const projects = [
    {
      id: 'proj_1',
      title: 'AI Text Detection Research',
      description: 'Benchmark LLM-generated text detection algorithms across academic literature',
      members: 4,
      papers: 12,
      tasks: 8,
      progress: 72
    },
    {
      id: 'proj_2',
      title: 'Quantum Computing Benchmark',
      description: 'Evaluate quantum algorithm speedups on molecular chemistry simulations',
      members: 3,
      papers: 6,
      tasks: 4,
      progress: 45
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Research Projects
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Collaborate on paper collections, assign tasks, and track milestone activity.
          </p>
        </div>

        <button
          onClick={() => router.push('/projects/new')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((proj) => (
          <div
            key={proj.id}
            onClick={() => router.push(`/projects/${proj.id}`)}
            className="p-6 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] hover:border-indigo-500/40 hover:bg-indigo-500/[0.03] transition-all cursor-pointer space-y-4 group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Folder size={22} />
              </div>
              <span className="text-xs font-semibold text-emerald-400">{proj.progress}% Complete</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--foreground)] group-hover:text-indigo-400 transition-colors">
                {proj.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {proj.description}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
              <span className="flex items-center gap-1"><Users size={14} /> {proj.members} members</span>
              <span className="flex items-center gap-1"><FileText size={14} /> {proj.papers} papers</span>
              <span className="flex items-center gap-1"><CheckSquare size={14} /> {proj.tasks} tasks</span>
            </div>

            <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${proj.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
