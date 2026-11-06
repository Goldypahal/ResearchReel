"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Plus, FileText, CheckSquare, Lock, Globe } from 'lucide-react';
import { projectsApi, errorMessage, type Project } from '@/lib/api';
import { Spinner, ErrorState, EmptyState, primaryBtn } from '@/components/common';
import { timeAgo } from '@/lib/format';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState('');
  const load = () => { setError(''); projectsApi.list().then(setProjects).catch((e) => setError(errorMessage(e))); };
  useEffect(load, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="text-indigo-400" /> Projects</h1>
          <p className="text-sm text-zinc-500">Collaborate with your team on tasks and papers.</p>
        </div>
        <Link href="/projects/new" className={primaryBtn}><Plus size={16} /> New project</Link>
      </div>
      {error ? <ErrorState message={error} onRetry={load} /> : !projects ? <Spinner /> : projects.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title="No projects yet" description="Create a project, invite collaborators and track your research tasks together."
          action={<Link href="/projects/new" className="text-sm font-semibold text-indigo-400">Create your first project</Link>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {projects.map((p) => {
            const pct = p.task_count ? Math.round(((p.done_count || 0) / p.task_count) * 100) : 0;
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="rounded-2xl border border-[var(--border)] p-5 hover:border-indigo-500/40 transition-colors space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold line-clamp-1">{p.name}</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--foreground)]/5 capitalize shrink-0">{p.user_role}</span>
                </div>
                {p.description && <p className="text-sm text-zinc-500 line-clamp-2">{p.description}</p>}
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1"><Users size={13} /> {p.member_count}</span>
                  <span className="inline-flex items-center gap-1"><CheckSquare size={13} /> {p.done_count}/{p.task_count}</span>
                  <span className="inline-flex items-center gap-1"><FileText size={13} /> {p.document_count}</span>
                  <span className="inline-flex items-center gap-1">{p.visibility === 'private' ? <Lock size={12} /> : <Globe size={12} />}</span>
                  <span className="ml-auto">Updated {timeAgo(p.updated_at)}</span>
                </div>
                <div className="h-1.5 rounded bg-[var(--foreground)]/10 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} /></div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
