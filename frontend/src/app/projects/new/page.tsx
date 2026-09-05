"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, Users, Globe, Lock, ArrowLeft, Loader2 } from 'lucide-react';

export default function CreateProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [field, setField] = useState('Artificial Intelligence');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [invites, setInvites] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/projects/proj_1');
    }, 800);
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

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--foreground)]">Invite Members (Optional)</label>
          <input
            type="text"
            placeholder="Enter emails or usernames separated by commas..."
            value={invites}
            onChange={(e) => setInvites(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 text-[var(--foreground)]"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={() => router.push('/projects')}
            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-[var(--foreground)] border border-[var(--border)] rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}
