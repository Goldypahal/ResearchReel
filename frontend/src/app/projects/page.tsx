"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, FileText, CheckSquare, Folder, Loader2 } from 'lucide-react';
import { projectsApi, Project } from '@/lib/api/projects';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await projectsApi.getProjects();
        setProjects(data);
      } catch (err: any) {
        console.error('Projects Error:', err);
        setError(err.message || 'Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    }
    loadProjects();
  }, []);

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

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-indigo-400 gap-2">
          <Loader2 size={24} className="animate-spin" />
          <span className="text-xs font-semibold">Loading research projects...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-[var(--foreground)]/[0.02] border border-[var(--border)] rounded-2xl space-y-4">
          <Folder size={40} className="mx-auto text-muted-foreground opacity-50" />
          <div>
            <h3 className="font-bold text-sm text-[var(--foreground)]">No Research Projects Yet</h3>
            <p className="text-xs text-muted-foreground mt-1">Create your first collaborative project to organize papers and tasks.</p>
          </div>
          <button
            onClick={() => router.push('/projects/new')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
          >
            Create First Project
          </button>
        </div>
      ) : (
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
                <span className="text-xs font-semibold text-indigo-400 capitalize">{proj.user_role || 'member'}</span>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-[var(--foreground)] group-hover:text-indigo-400 transition-colors">
                  {proj.name}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {proj.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                <span className="flex items-center gap-1"><Folder size={14} /> {proj.research_field || 'General'}</span>
                <span className="flex items-center gap-1 uppercase text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded text-indigo-400 font-semibold">{proj.visibility}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
