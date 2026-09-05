"use client";

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, FileText, CheckSquare, Users, Activity, 
  Plus, MoreVertical, Layers, CheckCircle2, Clock, Play
} from 'lucide-react';

export default function ProjectWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'tasks' | 'members'>('tasks');

  const tasks = [
    { id: 't1', title: 'Literature Review on LLM Detection', status: 'TODO', priority: 'High', assignee: 'Dr. Julia' },
    { id: 't2', title: 'Dataset Cleaning & Normalization', status: 'IN_PROGRESS', priority: 'Medium', assignee: 'Rajvir' },
    { id: 't3', title: 'Model Training & Evaluation', status: 'IN_PROGRESS', priority: 'High', assignee: 'Alex' },
    { id: 't4', title: 'Paper Draft Preparation', status: 'DONE', priority: 'Medium', assignee: 'Rajvir' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/projects')}
            className="p-1.5 rounded-lg hover:bg-[var(--foreground)]/10 text-muted-foreground hover:text-[var(--foreground)]"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-[var(--foreground)]">
              AI Text Detection Research
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              4 Members • 12 Papers • 72% Progress
            </p>
          </div>
        </div>

        <button className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5">
          <Plus size={14} /> Invite
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)]">
        {(['overview', 'documents', 'tasks', 'members'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-semibold capitalize border-b-2 transition-all ${
              activeTab === tab
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-muted-foreground hover:text-[var(--foreground)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Kanban Board Tab */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* TODO Column */}
          <div className="space-y-3 bg-[var(--foreground)]/[0.015] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-center justify-between font-bold text-xs text-muted-foreground uppercase tracking-wider">
              <span>To Do</span>
              <span className="px-2 py-0.5 rounded-full bg-[var(--foreground)]/10 text-[var(--foreground)]">
                {tasks.filter(t => t.status === 'TODO').length}
              </span>
            </div>

            <div className="space-y-3">
              {tasks.filter(t => t.status === 'TODO').map(task => (
                <div key={task.id} className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)] shadow-sm space-y-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                    {task.priority}
                  </span>
                  <h4 className="text-xs font-bold text-[var(--foreground)]">{task.title}</h4>
                  <p className="text-[10px] text-muted-foreground">Assignee: {task.assignee}</p>
                </div>
              ))}
            </div>
          </div>

          {/* IN PROGRESS Column */}
          <div className="space-y-3 bg-[var(--foreground)]/[0.015] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-center justify-between font-bold text-xs text-indigo-400 uppercase tracking-wider">
              <span>In Progress</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">
                {tasks.filter(t => t.status === 'IN_PROGRESS').length}
              </span>
            </div>

            <div className="space-y-3">
              {tasks.filter(t => t.status === 'IN_PROGRESS').map(task => (
                <div key={task.id} className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)] shadow-sm space-y-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {task.priority}
                  </span>
                  <h4 className="text-xs font-bold text-[var(--foreground)]">{task.title}</h4>
                  <p className="text-[10px] text-muted-foreground">Assignee: {task.assignee}</p>
                </div>
              ))}
            </div>
          </div>

          {/* DONE Column */}
          <div className="space-y-3 bg-[var(--foreground)]/[0.015] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-center justify-between font-bold text-xs text-emerald-400 uppercase tracking-wider">
              <span>Done</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                {tasks.filter(t => t.status === 'DONE').length}
              </span>
            </div>

            <div className="space-y-3">
              {tasks.filter(t => t.status === 'DONE').map(task => (
                <div key={task.id} className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)] shadow-sm space-y-2 opacity-80">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Completed
                  </span>
                  <h4 className="text-xs font-bold text-[var(--foreground)] line-through">{task.title}</h4>
                  <p className="text-[10px] text-muted-foreground">Assignee: {task.assignee}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'tasks' && (
        <div className="py-12 text-center text-xs text-muted-foreground">
          <p className="font-semibold text-sm capitalize">{activeTab} Section</p>
          <p>Manage project {activeTab} for AI Text Detection Research.</p>
        </div>
      )}
    </div>
  );
}
