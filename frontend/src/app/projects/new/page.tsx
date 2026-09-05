"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Globe, ArrowLeft, Loader2 } from 'lucide-react';
import { projectsApi } from '@/lib/api/projects';

export default function CreateProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [field, setField] = useState('Artificial Intelligence');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const newProject = await projectsApi.createProject({
        name: name.trim(),
        description: description.trim(),
        research_field: field,
        visibility
      });
      router.push(`/projects/${newProject.id}`);
    } catch (err: any) {
      console.error('Create Project Error:', err);
      setError(err.message || 'Failed to create project');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/projects')}
          className="p-1.5 rounded-lg hover:bg-[var(--foreground)]/10 text-muted-foreground hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl md:text-2xl font-extrabold text-[var(--foreground)]">Create New Research Project</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--foreground)]">Project Name</label>
          <input
            type="text"
            placeholder="e.g. AI Text Detection Research"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 text-[var(--foreground)]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--foreground)]">Description</label>
          <textarea
            placeholder="Summarize project goals, literature scope, and expected outcomes..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 text-[var(--foreground)] resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--foreground)]">Research Field</label>
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 text-[var(--foreground)]"
          >
            <option value="Artificial Intelligence">Artificial Intelligence & ML</option>
            <option value="Bioinformatics">Bioinformatics & Genomics</option>
            <option value="Quantum Computing">Quantum Computing</option>
            <option value="Neuroscience">Cognitive Neuroscience</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--foreground)]">Visibility</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`p-3 rounded-xl border text-left flex items-center gap-3 text-xs font-semibold transition-all ${
                visibility === 'private'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-[var(--border)] text-muted-foreground'
              }`}
            >
              <Lock size={16} />
              <div>
                <p>Private</p>
                <p className="text-[10px] font-normal text-muted-foreground">Only invited members</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={`p-3 rounded-xl border text-left flex items-center gap-3 text-xs font-semibold transition-all ${
                visibility === 'public'
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-[var(--border)] text-muted-foreground'
              }`}
            >
              <Globe size={16} />
              <div>
                <p>Public</p>
                <p className="text-[10px] font-normal text-muted-foreground">Visible to community</p>
              </div>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => router.push('/projects')}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-[var(--foreground)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            <span>Create Project</span>
          </button>
        </div>
      </form>
    </div>
  );
}
